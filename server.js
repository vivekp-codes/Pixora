import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import admin from "firebase-admin";

try {
  process.loadEnvFile();
} catch {}
try {
  process.loadEnvFile("env");
} catch {}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUD_ENABLED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);
const CLOUD_FOLDER = "pixora";

// Firebase Admin verifies client ID tokens and talks to Firestore.
// Credentials come from either one JSON blob (FIREBASE_SERVICE_ACCOUNT) or
// the three split vars below. Unlike Supabase, nothing here ever pauses.
function normalizeServiceAccount(raw) {
  if (!raw) return null;
  const projectId = raw.projectId || raw.project_id;
  const clientEmail = raw.clientEmail || raw.client_email;
  const privateKey = raw.privateKey || raw.private_key;
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey: String(privateKey).replace(/\\n/g, "\n") };
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return normalizeServiceAccount(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } catch (err) {
      console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON:", err.message);
      return null;
    }
  }
  return normalizeServiceAccount({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  });
}

const serviceAccount = loadServiceAccount();
const AUTH_ENABLED = Boolean(serviceAccount);

let db = null;
if (AUTH_ENABLED) {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const GENERATED_DIR = path.join(__dirname, "generated");
const HISTORY_FILE = path.join(__dirname, "history.json");
const CLIENT_DIST = path.join(__dirname, "dist");

// Make sure our storage exists before we take any requests. Guarded so a
// read-only deployment filesystem (serverless) can't crash the process.
try {
  if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");
} catch (err) {
  console.warn("Local storage init skipped (read-only fs):", err.message);
}

app.use(express.json());

// Serve generated images directly
app.use("/generated", express.static(GENERATED_DIR));

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeHistory(entries) {
  // Best-effort only: the deployment filesystem is read-only on serverless
  // platforms, so failures here must never crash a request.
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.warn("History write skipped (read-only fs):", err.message);
  }
}

// Express 4 does not catch errors thrown inside async handlers by default.
// Without this, one rejected promise kills the whole Node process, which
// drops every in-flight connection (browser sees net::ERR_CONNECTION_RESET).
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("Request handler error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Something went wrong on the server." });
      } else {
        res.end();
      }
    });
  };
}

// Last-resort safety net: log rather than crash. Prevents a single bad
// request from taking the whole API down.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason?.stack || reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.stack || err);
});

function clampDimension(value, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(1024, Math.max(256, n));
}

function toIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapDoc(doc) {
  const d = doc.data() || {};
  return {
    id: doc.id,
    prompt: d.prompt,
    width: d.width,
    height: d.height,
    seed: d.seed,
    url: d.url,
    favorite: d.favorite,
    createdAt: toIso(d.createdAt),
  };
}

function imagesCollection(userId) {
  return db.collection("users").doc(userId).collection("images");
}

// Pull the Cloudinary public_id out of a stored URL so we can destroy the asset later
function cloudPublicIdFromUrl(url) {
  if (!url || !url.includes("/image/upload/")) return null;
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  return match[1].replace(/\.[a-z0-9]+$/i, "");
}

function destroyCloudAsset(url) {
  const publicId = cloudPublicIdFromUrl(url);
  if (!publicId) return;
  cloudinary.uploader
    .destroy(publicId)
    .then((result) => {
      if (result.result !== "ok") console.warn("Cloudinary destroy result:", result.result);
    })
    .catch((err) => console.error("Cloudinary destroy failed:", err.message));
}

// Attach the signed-in user (when auth is on). Falls back to legacy file storage otherwise.
async function requireUser(req, res, next) {
  if (!AUTH_ENABLED) {
    req.user = null;
    return next();
  }

  const match = (req.headers.authorization || "").match(/^Bearer (.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = { id: decoded.uid, email: decoded.email || "", name: decoded.name || "" };
    next();
  } catch (err) {
    console.error("Auth validation failed:", err.message);
    return res.status(401).json({ error: "Your session expired. Please sign in again." });
  }
}

// One-time: lift any legacy local prints into Firestore for a brand-new user
async function migrateLegacy(userId) {
  const imagesRef = imagesCollection(userId);
  const existing = await imagesRef.limit(1).get();
  if (!existing.empty) return false;

  const legacy = readHistory();
  if (!legacy.length) return false;

  const batch = db.batch();
  for (const entry of legacy) {
    const id = entry.id || crypto.randomUUID();
    batch.set(imagesRef.doc(id), {
      prompt: entry.prompt,
      width: entry.width,
      height: entry.height,
      seed: entry.seed,
      url: entry.url,
      favorite: false,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(entry.createdAt || Date.now())),
    });
  }
  await batch.commit();
  return true;
}

// Return past prints, newest first
app.get("/api/history", requireUser, asyncHandler(async (req, res) => {
  if (!db) {
    return res.json(readHistory().slice().reverse());
  }

  try {
    await migrateLegacy(req.user.id);
    const snap = await imagesCollection(req.user.id)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    res.json(snap.docs.map(mapDoc));
  } catch (err) {
    console.error("History load failed:", err.message);
    res.status(500).json({ error: "Could not load your images." });
  }
}));

// Generate a new print from a text prompt via Pollinations.ai (no API key required)
app.post("/api/generate", requireUser, asyncHandler(async (req, res) => {
  const prompt = (req.body.prompt || "").trim();
  const width = clampDimension(req.body.width, 768);
  const height = clampDimension(req.body.height, 768);

  if (!prompt) {
    return res.status(400).json({ error: "A prompt is required." });
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ error: "Keep prompts under 1000 characters." });
  }

  const seed = Math.floor(Math.random() * 1_000_000);
  const encodedPrompt = encodeURIComponent(prompt);
  const sourceUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  try {
    const upstream = await fetch(sourceUrl);
    if (!upstream.ok) {
      throw new Error(`Upstream returned ${upstream.status}`);
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());

    const id = crypto.randomUUID();

    // Save to Cloudinary when configured, otherwise fall back to local disk
    let url = null;

    if (CLOUD_ENABLED) {
      try {
        const uploaded = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { public_id: id, folder: CLOUD_FOLDER, format: "jpg", resource_type: "image" },
            (error, result) => (error ? reject(error) : resolve(result))
          );
          stream.end(buffer);
        });
        url = uploaded.secure_url;
      } catch (err) {
        console.error("Cloudinary upload failed, falling back to local:", err.message);
        url = null;
      }
    }

    if (!url) {
      const filename = `${id}.jpg`;
      try {
        fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);
        url = `/generated/${filename}`;
      } catch (err) {
        console.warn("Local image save skipped (read-only fs):", err.message);
        url = null;
      }
      if (!url) {
        return res.status(502).json({ error: "Storage isn't writable here. Check the Cloudinary configuration." });
      }
    }

    const createdAt = new Date();

    let entry;
    if (db) {
      await imagesCollection(req.user.id).doc(id).set({
        prompt,
        width,
        height,
        seed,
        url,
        favorite: false,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      });
      entry = { id, prompt, width, height, seed, url, favorite: false, createdAt: createdAt.toISOString() };
    } else {
      entry = {
        id,
        prompt,
        width,
        height,
        seed,
        url,
        favorite: false,
        createdAt: createdAt.toISOString(),
      };
      const history = readHistory();
      history.push(entry);
      // Keep the last 100 prints so history.json doesn't grow unbounded
      writeHistory(history.slice(-100));
    }

    res.json(entry);
  } catch (err) {
    console.error("Generation failed:", err.message);
    res.status(502).json({ error: "The image generator didn't respond. Try again in a moment." });
  }
}));

// Delete a print by id: removes the database row and the Cloudinary/local asset
app.post("/api/delete", requireUser, asyncHandler(async (req, res) => {
  const id = (req.body.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "An image id is required." });
  }

  if (!db) {
    const history = readHistory();
    const entry = history.find((e) => e.id === id);
    if (!entry) {
      return res.status(404).json({ error: "Image not found." });
    }
    destroyCloudAsset(entry.url);
    const filename = path.basename(entry.url || "");
    const filePath = path.join(GENERATED_DIR, filename);
    if (filename && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn("Local image delete skipped (read-only fs):", err.message);
      }
    }
    writeHistory(history.filter((e) => e.id !== id));
    return res.json({ ok: true, id });
  }

  try {
    const ref = imagesCollection(req.user.id).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Image not found." });
    }

    destroyCloudAsset(doc.data().url);
    await ref.delete();

    res.json({ ok: true, id });
  } catch (err) {
    console.error("Delete failed:", err.message);
    res.status(500).json({ error: "Could not delete the image." });
  }
}));

// Toggle favorite state for an image
app.post("/api/favorite", requireUser, asyncHandler(async (req, res) => {
  if (!db) {
    return res.json({ ok: true, favorite: Boolean(req.body.favorite) });
  }

  const id = (req.body.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "An image id is required." });
  }

  try {
    const ref = imagesCollection(req.user.id).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Image not found." });
    }
    const favorite = Boolean(req.body.favorite);
    await ref.update({ favorite });
    res.json({ ok: true, id, favorite });
  } catch (err) {
    console.error("Favorite update failed:", err.message);
    res.status(500).json({ error: "Could not update the image." });
  }
}));

// Update the display name shown on the user's profile
app.post("/api/profile", requireUser, asyncHandler(async (req, res) => {
  if (!db) {
    return res.json({ ok: true, name: req.body.name || "User" });
  }

  const name = (req.body.name || "").trim().slice(0, 60);
  if (!name) {
    return res.status(400).json({ error: "A name is required." });
  }

  try {
    await db.collection("profiles").doc(req.user.id).set(
      {
        name,
        email: req.user.email || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    res.json({ ok: true, name });
  } catch (err) {
    console.error("Profile update failed:", err.message);
    res.status(500).json({ error: "Could not update your profile." });
  }
}));

// Read the signed-in user's display name
app.get("/api/profile", requireUser, asyncHandler(async (req, res) => {
  if (!db) {
    return res.json({ name: "User" });
  }

  try {
    const doc = await db.collection("profiles").doc(req.user.id).get();
    const fallback = (req.user.email || "user@pixora.ai").split("@")[0];
    const defaultName = fallback.charAt(0).toUpperCase() + fallback.slice(1);
    res.json({ name: (doc.exists && doc.data().name) || defaultName });
  } catch (err) {
    console.error("Profile load failed:", err.message);
    res.status(500).json({ error: "Could not load your profile." });
  }
}));

// Bulk clear: either the whole history or all favorites
app.post("/api/clear", requireUser, asyncHandler(async (req, res) => {
  const target = req.body.target;

  if (!db) {
    if (target === "history") {
      writeHistory([]);
    }
    return res.json({ ok: true });
  }

  try {
    const imagesRef = imagesCollection(req.user.id);
    if (target === "history") {
      const snap = await imagesRef.get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } else if (target === "favorites") {
      const snap = await imagesRef.where("favorite", "==", true).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.update(d.ref, { favorite: false }));
      await batch.commit();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Clear failed:", err.message);
    res.status(500).json({ error: "Could not clear the images." });
  }
}));

// In production, serve the built React app. In dev, the Vite dev server
// (port 5173) handles the frontend and proxies /api here instead.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

// Vercel serverless invokes the exported `app` directly, so we must NOT
// call app.listen() in that environment (it would leave dangling handles).
// Locally we keep the familiar `npm run dev` / `npm start` behaviour.
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Print Lab API running at http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nPort ${PORT} is already in use by another process.`);
      console.error("A previous server may still be running (lost orphan when the terminal closed).");
      console.error("Fix: run  npm run kill:port   then   npm run dev\n");
      process.exit(1);
    }
    throw err;
  });
}

export { app };
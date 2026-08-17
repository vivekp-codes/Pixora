import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile();
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = AUTH_ENABLED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const GENERATED_DIR = path.join(__dirname, "generated");
const HISTORY_FILE = path.join(__dirname, "history.json");
const CLIENT_DIST = path.join(__dirname, "dist");

// Make sure our storage exists before we take any requests
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");

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
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
}

function clampDimension(value, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(1024, Math.max(256, n));
}

function mapRow(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    width: row.width,
    height: row.height,
    seed: row.seed,
    url: row.url,
    favorite: row.favorite,
    createdAt: row.created_at,
  };
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
    req.userClient = null;
    return next();
  }

  const match = (req.headers.authorization || "").match(/^Bearer (.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) {
    return res.status(401).json({ error: "Your session expired. Please sign in again." });
  }

  req.user = data.user;
  req.userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });
  next();
}

// One-time: lift any legacy local prints into the database for the first user
async function migrateLegacy(userClient, userId) {
  const { data, error } = await userClient.from("images").select("id").limit(1);
  if (error) throw error;
  if (data.length) return false;

  const legacy = readHistory();
  if (!legacy.length) return false;

  const rows = legacy.map((entry) => ({
    id: entry.id,
    user_id: userId,
    prompt: entry.prompt,
    width: entry.width,
    height: entry.height,
    seed: entry.seed,
    url: entry.url,
    favorite: false,
    created_at: entry.createdAt,
  }));

  const { error: insertError } = await userClient.from("images").insert(rows);
  if (insertError) throw insertError;
  return true;
}

// Return past prints, newest first
app.get("/api/history", requireUser, async (req, res) => {
  if (!req.userClient) {
    return res.json(readHistory().slice().reverse());
  }

  try {
    await migrateLegacy(req.userClient, req.user.id);
    const { data, error } = await req.userClient
      .from("images")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json((data || []).map(mapRow));
  } catch (err) {
    console.error("History load failed:", err.message);
    res.status(500).json({ error: "Could not load your images." });
  }
});

// Generate a new print from a text prompt via Pollinations.ai (no API key required)
app.post("/api/generate", requireUser, async (req, res) => {
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
      fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);
      url = `/generated/${filename}`;
    }

    const createdAt = new Date().toISOString();

    let entry;
    if (req.userClient) {
      const { data, error } = await req.userClient
        .from("images")
        .insert({
          id,
          user_id: req.user.id,
          prompt,
          width,
          height,
          seed,
          url,
          favorite: false,
          created_at: createdAt,
        })
        .select()
        .single();
      if (error) throw error;
      entry = mapRow(data);
    } else {
      entry = {
        id,
        prompt,
        width,
        height,
        seed,
        url,
        favorite: false,
        createdAt,
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
});

// Delete a print by id: removes the database row and the Cloudinary/local asset
app.post("/api/delete", requireUser, async (req, res) => {
  const id = (req.body.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "An image id is required." });
  }

  if (!req.userClient) {
    const history = readHistory();
    const entry = history.find((e) => e.id === id);
    if (!entry) {
      return res.status(404).json({ error: "Image not found." });
    }
    destroyCloudAsset(entry.url);
    const filename = path.basename(entry.url || "");
    const filePath = path.join(GENERATED_DIR, filename);
    if (filename && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    writeHistory(history.filter((e) => e.id !== id));
    return res.json({ ok: true, id });
  }

  try {
    const { data, error } = await req.userClient
      .from("images")
      .select("url")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();
    if (error || !data) {
      return res.status(404).json({ error: "Image not found." });
    }

    destroyCloudAsset(data.url);

    const { error: deleteError } = await req.userClient
      .from("images")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);
    if (deleteError) throw deleteError;

    res.json({ ok: true, id });
  } catch (err) {
    console.error("Delete failed:", err.message);
    res.status(500).json({ error: "Could not delete the image." });
  }
});

// Toggle favorite state for an image
app.post("/api/favorite", requireUser, async (req, res) => {
  if (!req.userClient) {
    return res.json({ ok: true, favorite: Boolean(req.body.favorite) });
  }

  const id = (req.body.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "An image id is required." });
  }

  try {
    const { data, error } = await req.userClient
      .from("images")
      .update({ favorite: Boolean(req.body.favorite) })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("favorite")
      .single();
    if (error || !data) {
      return res.status(404).json({ error: "Image not found." });
    }
    res.json({ ok: true, id, favorite: data.favorite });
  } catch (err) {
    console.error("Favorite update failed:", err.message);
    res.status(500).json({ error: "Could not update the image." });
  }
});

// Update the display name shown on the user's profile
app.post("/api/profile", requireUser, async (req, res) => {
  if (!req.userClient) {
    return res.json({ ok: true, name: req.body.name || "User" });
  }

  const name = (req.body.name || "").trim().slice(0, 60);
  if (!name) {
    return res.status(400).json({ error: "A name is required." });
  }

  try {
    const { error } = await req.userClient
      .from("profiles")
      .upsert({ id: req.user.id, name }, { onConflict: "id" });
    if (error) throw error;
    res.json({ ok: true, name });
  } catch (err) {
    console.error("Profile update failed:", err.message);
    res.status(500).json({ error: "Could not update your profile." });
  }
});

// Read the signed-in user's display name
app.get("/api/profile", requireUser, async (req, res) => {
  if (!req.userClient) {
    return res.json({ name: "User" });
  }

  try {
    const { data, error } = await req.userClient
      .from("profiles")
      .select("name")
      .eq("id", req.user.id)
      .maybeSingle();
    if (error) throw error;

    const fallback = (req.user.email || "user@pixora.ai").split("@")[0];
    const defaultName = fallback.charAt(0).toUpperCase() + fallback.slice(1);
    res.json({ name: data?.name || defaultName });
  } catch (err) {
    console.error("Profile load failed:", err.message);
    res.status(500).json({ error: "Could not load your profile." });
  }
});

// Bulk clear: either the whole history or all favorites
app.post("/api/clear", requireUser, async (req, res) => {
  const target = req.body.target;

  if (!req.userClient) {
    if (target === "history") {
      writeHistory([]);
    }
    return res.json({ ok: true });
  }

  try {
    if (target === "history") {
      const { error } = await req.userClient.from("images").delete().eq("user_id", req.user.id);
      if (error) throw error;
    } else if (target === "favorites") {
      const { error } = await req.userClient
        .from("images")
        .update({ favorite: false })
        .eq("user_id", req.user.id);
      if (error) throw error;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Clear failed:", err.message);
    res.status(500).json({ error: "Could not clear the images." });
  }
});

// In production, serve the built React app. In dev, the Vite dev server
// (port 5173) handles the frontend and proxies /api here instead.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Print Lab API running at http://localhost:${PORT}`);
});
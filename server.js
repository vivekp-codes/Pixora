import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

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

// Return past prints, newest first
app.get("/api/history", (req, res) => {
  const history = readHistory().slice().reverse();
  res.json(history);
});

// Generate a new print from a text prompt via Pollinations.ai (no API key required)
app.post("/api/generate", async (req, res) => {
  const prompt = (req.body.prompt || "").trim();
  const width = clampDimension(req.body.width, 768);
  const height = clampDimension(req.body.height, 768);

  if (!prompt) {
    return res.status(400).json({ error: "A prompt is required." });
  }
  if (prompt.length > 500) {
    return res.status(400).json({ error: "Keep prompts under 500 characters." });
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
    const filename = `${id}.jpg`;
    fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);

    const entry = {
      id,
      prompt,
      width,
      height,
      seed,
      url: `/generated/${filename}`,
      createdAt: new Date().toISOString(),
    };

    const history = readHistory();
    history.push(entry);
    // Keep the last 100 prints so history.json doesn't grow unbounded
    writeHistory(history.slice(-100));

    res.json(entry);
  } catch (err) {
    console.error("Generation failed:", err.message);
    res.status(502).json({ error: "The image generator didn't respond. Try again in a moment." });
  }
});

// Delete a print by id: removes its record from history.json and the file on disk
app.post("/api/delete", (req, res) => {
  const id = (req.body.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "An image id is required." });
  }

  const history = readHistory();
  const entry = history.find((e) => e.id === id);
  if (!entry) {
    return res.status(404).json({ error: "Image not found." });
  }

  // Only ever touch a filename derived from our own stored url, never a raw path
  const filename = path.basename(entry.url || "");
  const filePath = path.join(GENERATED_DIR, filename);
  if (filename && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  writeHistory(history.filter((e) => e.id !== id));
  res.json({ ok: true, id });
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

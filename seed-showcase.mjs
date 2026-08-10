import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.join(__dirname, "generated");
const HISTORY_FILE = path.join(__dirname, "history.json");

const SHOWCASE = [
  {
    prompt:
      "Cinematic moody portrait of a young woman, teal and orange rim lighting, shallow depth of field, film grain, dramatic studio lighting, 85mm lens, hyper detailed",
    width: 896,
    height: 1152,
  },
  {
    prompt:
      "Futuristic megacity at night, glowing neon skyline, flying vehicles between skyscrapers, wet reflective streets, cyberpunk atmosphere, cinematic, ultra detailed",
    width: 1152,
    height: 768,
  },
  {
    prompt:
      "Luxury perfume bottle product render, black and gold, studio lighting, reflective black marble surface, soft shadows, macro advertising photography",
    width: 896,
    height: 896,
  },
  {
    prompt:
      "Surreal dreamlike landscape, floating islands above a violet glowing sea, giant crescent moon, luminous clouds, ethereal fog, highly detailed digital art",
    width: 1152,
    height: 768,
  },
];

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

async function generate(entry) {
  const seed = Math.floor(Math.random() * 1_000_000);
  const encoded = encodeURIComponent(entry.prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${entry.width}&height=${entry.height}&seed=${seed}&nologo=true`;
  const upstream = await fetch(url);
  if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
  const buffer = Buffer.from(await upstream.arrayBuffer());

  const id = crypto.randomUUID();
  const filename = `${id}.jpg`;
  fs.writeFileSync(path.join(GENERATED_DIR, filename), buffer);

  return {
    id,
    prompt: entry.prompt,
    width: entry.width,
    height: entry.height,
    seed,
    url: `/generated/${filename}`,
    createdAt: new Date().toISOString(),
  };
}

const history = readHistory();

for (const entry of SHOWCASE) {
  process.stdout.write(`  generating "${entry.prompt.slice(0, 40)}..." `);
  try {
    const saved = await generate(entry);
    history.push(saved);
    process.stdout.write(`OK -> ${saved.url}\n`);
  } catch (err) {
    process.stdout.write(`FAILED (${err.message})\n`);
  }
}

fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
console.log("done.");
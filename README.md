# Print Lab

A fully free, fullstack text-to-image generator — **everything in one folder**, no `client/` subfolder split.

- **Backend**: Node.js + Express (`server.js`)
- **Frontend**: React + Vite (`src/`, `index.html`, `vite.config.js`)
- **One `package.json`** for both
- **Image generation**: [Pollinations.ai](https://pollinations.ai) — no API key, no signup, no cost

```
print-lab/
├── server.js           ← Express API (serves /api routes, and the built app in production)
├── package.json         ← every dependency + script, backend and frontend
├── vite.config.js        ← Vite config, proxies /api and /generated to Express in dev
├── index.html             ← Vite entry HTML
├── src/
│   ├── App.jsx             ← the whole UI
│   ├── main.jsx
│   └── index.css
├── public/                ← static assets (favicon etc.)
├── generated/              ← generated images get saved here
└── history.json            ← created automatically on first run
```

## Setup — step by step

**1. Check you have Node.js 18 or newer**

```bash
node -v
```
If that fails or shows a version below 18, install Node from https://nodejs.org first.

**2. Open a terminal in this folder**

```bash
cd print-lab
```

**3. Install everything (backend + frontend) with one command**

```bash
npm install
```

**4. Start the app in development mode**

```bash
npm run dev
```
This runs two things at once, side by side in your terminal:
- Express API on **http://localhost:3000**
- Vite dev server (hot-reloading React) on **http://localhost:5173**

**5. Open the app**

Go to **http://localhost:5173**. The Vite dev server automatically forwards any `/api/...` and `/generated/...` request to Express on port 3000, so you only ever need to visit port 5173 while developing.

Type a prompt, hit **Develop**, and watch it appear below.

## Running it in production (one server, one port)

```bash
npm run build   # bundles the React app into dist/
npm start        # Express now also serves the built frontend
```
Then everything — frontend and API — is on **http://localhost:3000**.

## How it works

- `POST /api/generate` — takes your prompt, calls Pollinations.ai's image endpoint, saves the image into `generated/`, and logs the prompt + metadata to `history.json`
- `GET /api/history` — returns everything generated so far, newest first, so refreshing the page doesn't lose your gallery
- `src/App.jsx` just calls those two endpoints — nothing else to configure

## Swapping in a different free provider later

- **Hugging Face Inference API**: free account, generate a token, and in `server.js` replace the `fetch(sourceUrl)` call with a request to `https://api-inference.huggingface.co/models/<model-id>`, sending your token as a Bearer header.
- **Self-hosted model** (Stable Diffusion, FLUX.1 Schnell): run a Python inference server (e.g. with the `diffusers` library) alongside this app and point `server.js` at it instead. The React frontend doesn't need any changes.

## Notes

- `generated/` and `history.json` form a simple flat-file store, capped at the last 100 prints — fine for local use, swap for a real database + object storage before deploying somewhere that wipes the filesystem on redeploy.
- Pollinations.ai is a free community service with no uptime guarantee or SLA — expect occasional slow responses or downtime.

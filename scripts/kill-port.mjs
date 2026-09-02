import { execSync } from "node:child_process";
import process from "node:process";

const PORT = parseInt(process.argv[2] || "3000", 10);

function pidsOnPort(port) {
  const pids = new Set();
  try {
    if (process.platform === "win32") {
      const out = execSync("netstat -ano", { stdio: ["ignore", "pipe", "ignore"] }).toString();
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;
        const local = parts[1] || "";
        if (local.endsWith(`:${port}`)) pids.add(parts[4]);
      }
    } else {
      try {
        const out = execSync(`lsof -ti:${port}`, { stdio: ["ignore", "pipe", "ignore"] }).toString();
        for (const pid of out.split(/\s+/)) if (pid.trim()) pids.add(pid.trim());
      } catch {}
    }
  } catch {}
  return [...pids];
}

const self = process.pid;

for (const pid of pidsOnPort(PORT)) {
  if (String(pid) === String(self)) continue;
  try {
    process.kill(pid);
    console.log(`[kill-port] Killed stale process ${pid} on port ${PORT}`);
  } catch {
    console.log(`[kill-port] Could not kill process ${pid} (maybe already gone)`);
  }
}
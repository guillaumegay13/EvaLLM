import { spawn } from "node:child_process";

const processes = [];

function launch(label, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });

  processes.push(child);
}

function shutdown(code = 0) {
  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting EvaLLM UI on http://127.0.0.1:3030 and API on http://127.0.0.1:3031");
launch("api", "node", ["--watch", "server.mjs"]);
launch("ui", process.platform === "win32" ? "npx.cmd" : "npx", ["vite"]);

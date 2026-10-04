import { spawn, spawnSync } from "node:child_process";

// Playwright supplies disconnected environment values. Never point browser tests at a school.
const next = "node_modules/next/dist/bin/next";
const build = spawnSync(process.execPath, [next, "build"], { stdio: "inherit", env: process.env });
if (build.status !== 0) process.exit(build.status ?? 1);
const server = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", "3001"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", code => process.exit(code ?? 0));

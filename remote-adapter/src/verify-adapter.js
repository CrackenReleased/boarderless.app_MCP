import { WebSocket } from "ws";
import http from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting remote adapter verification tests...");

// Start the server programmatically
const serverProcess = spawn("node", ["dist/server.cjs"], {
  cwd: path.resolve(__dirname, ".."),
  env: { ...process.env, PORT: "5050" }
});

let serverStderr = "";
serverProcess.stderr.on("data", (data) => {
  serverStderr += data;
});

serverProcess.stdout.on("data", (data) => {
  console.log(`[Server]: ${data.toString().trim()}`);
});

// Give the server 3.5 seconds to boot, then run tests
setTimeout(() => {
  if (serverProcess.exitCode !== null) {
    console.error(`Server process exited early with code ${serverProcess.exitCode}. Stderr:`);
    console.error(serverStderr);
    process.exit(1);
  }

  // Test health check
  http.get("http://localhost:5050/health", (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        if (json.status !== "healthy") {
          throw new Error("Health check returned unhealthy status");
        }
        console.log("PASS: Health check verified successfully!");

        // Test WebSocket Bridge
        const ws = new WebSocket("ws://localhost:5050/bridge?userId=test-operator");
        ws.on("open", () => {
          console.log("PASS: WebSocket bridge handshake verified successfully!");
          ws.close();
          serverProcess.kill();
          console.log("ALL REMOTE ADAPTER TESTS PASSED!");
          process.exit(0);
        });
        ws.on("error", (err) => {
          console.error("FAIL: WebSocket connection failed:", err);
          serverProcess.kill();
          process.exit(1);
        });
      } catch (err) {
        console.error("FAIL: Health check response parse failed:", err);
        serverProcess.kill();
        process.exit(1);
      }
    });
  }).on("error", (err) => {
    console.error("FAIL: Health check request failed:", err);
    serverProcess.kill();
    process.exit(1);
  });
}, 3500);

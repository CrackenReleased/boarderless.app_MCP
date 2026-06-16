import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, 'mcp-stdio-server.js');

async function testNonBlockingStartup() {
  console.log('[Test] Running non-blocking startup integration test...');
  console.log(`[Test] Server path: ${serverPath}`);

  return new Promise((resolve, reject) => {
    // Spawn the MCP server process
    const child = spawn('node', [serverPath], {
      env: {
        ...process.env,
        BOARDERLESS_MCP_HEADLESS: 'true', // Use headless if spawning a new browser
      }
    });

    let stdoutData = '';
    let stderrData = '';
    let isConnectedDetected = false;
    let isAuthRequiredDetected = false;

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      stderrData += msg;
      
      if (msg.includes('Proceeding to start MCP server in unauthenticated mode')) {
        isAuthRequiredDetected = true;
      }
      if (msg.includes('MCP Server running on stdio connected to')) {
        isConnectedDetected = true;
        // Success! We reached the running state. Kill the process now.
        child.kill();
      }
    });

    // Set a timeout of 10 seconds. The old code would hang forever here.
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(
        `Regression test failed: MCP Server startup timed out (hung). \n` +
        `Stderr output:\n${stderrData}\n` +
        `Stdout output:\n${stdoutData}`
      ));
    }, 10000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      
      if (isConnectedDetected) {
        console.log('[✓] MCP Server successfully started and connected to stdio without blocking on auth!');
        if (isAuthRequiredDetected) {
          console.log('[✓] Verified "Proceeding to start MCP server in unauthenticated mode" warning was logged.');
        } else {
          console.log('[i] Note: Session was already authenticated, so no unauthenticated warning was printed.');
        }
        resolve();
      } else {
        reject(new Error(`MCP server exited prematurely with code ${code}. Stderr: ${stderrData}`));
      }
    });
  });
}

async function run() {
  try {
    await testNonBlockingStartup();
    console.log('\n\x1b[32m[✓] Regression test for non-blocking auth passed successfully!\x1b[0m\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n\x1b[31m[!] Regression Test Failed:\x1b[0m`, error.message);
    process.exit(1);
  }
}

run();

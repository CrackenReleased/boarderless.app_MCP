// index.js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  console.log("Connecting to Boarderless MCP Server...");
  
  // Point to the local Boarderless MCP stdio server script
  const serverScript = join(__dirname, "mcp-stdio-server.js");
  
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverScript],
    env: {
      ...process.env,
      BOARDERLESS_MCP_APP_URL: "http://127.0.0.1:5174/canvas",
      BOARDERLESS_MCP_BROWSER_URL: "http://127.0.0.1:9222"
    }
  });

  const client = new Client(
    { name: "boarderless-boilerplate-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("Connected successfully!");

  // 1. List available tools
  console.log("\nListing tools...");
  const toolsResponse = await client.listTools();
  console.log("Available tools:", toolsResponse.tools.map(t => t.name));

  // 2. Read the board snapshot
  console.log("\nReading board state...");
  const boardState = await client.callTool({
    name: "get_board_state",
    arguments: {},
  });
  
  const snapshot = JSON.parse(boardState.content[0].text);
  console.log(`Board has ${snapshot.objectCount} objects.`);
  console.log("Objects ledger:\n", JSON.stringify(snapshot.objects, null, 2));

  // 3. Mutate an object if one exists
  if (snapshot.objects.length > 0) {
    const firstObject = snapshot.objects[0];
    console.log(`\nMutating first object (${firstObject.id})...`);
    
    // Shift it 50 pixels right
    const mutationResponse = await client.callTool({
      name: "mutate_object",
      arguments: {
        id: firstObject.id,
        x: firstObject.x + 50,
      },
    });
    
    console.log("Mutation response:", mutationResponse.content[0].text);
  } else {
    console.log("\nNo objects on canvas to mutate. Draw something on http://127.0.0.1:5174/canvas and run again!");
  }

  await client.close();
}

run().catch(console.error);

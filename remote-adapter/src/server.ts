import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListToolsResult,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

// Resolve directory name safely for both CommonJS and ES Modules
let currentDirname: string;
try {
  // @ts-ignore
  currentDirname = __dirname;
} catch {
  const filename = fileURLToPath(import.meta.url);
  currentDirname = path.dirname(filename);
}

// Initialize Express and HTTP Server
const app = express();
app.use(express.json());
const httpServer = createServer(app);

// Initialize WebSocket Server for Browser-Mediated Outbound Bridge
const wss = new WebSocketServer({ noServer: true });

// Active Browser Bridges: maps userId -> WebSocket instance
const activeBridges = new Map<string, WebSocket>();

// Pending Client Requests: maps requestId -> { resolve, reject, timeout }
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}
const pendingRequests = new Map<string, PendingRequest>();

// Load functions.json dynamically for tool definitions
const functionsPath = path.resolve(currentDirname, "../../functions.json");
let toolDefinitions: any[] = [];
try {
  const fileContent = fs.readFileSync(functionsPath, "utf-8");
  const parsed = JSON.parse(fileContent);
  // Map our functions schema to MCP Tool format
  toolDefinitions = parsed.functions.map((fn: any) => ({
    name: fn.name,
    description: fn.description,
    inputSchema: {
      type: "object",
      properties: fn.parameters.properties,
      required: fn.parameters.required || [],
    },
  }));
  console.log(`Successfully loaded ${toolDefinitions.length} tools from functions.json`);
} catch (error) {
  console.error("Error reading functions.json, fallback to empty tools:", error);
}

// Instantiate the MCP Server
const mcpServer = new Server(
  {
    name: "boarderless-remote-adapter",
    version: "0.1.26",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register MCP Tool Listing Handler
mcpServer.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  return {
    tools: toolDefinitions,
  };
});

// Register MCP Tool Call Forwarder Handler
mcpServer.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  // Simple extraction of mock user identity (Bearer Token)
  // In production, this token is validated against an OAuth 2.1 authorization server
  const mockUserId = "joel-mccracken"; 

  const ws = activeBridges.get(mockUserId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error(
      "No active Boarderless canvas tab is paired. Please open your Boarderless canvas and start pairing."
    );
  }

  // Generate unique request ID
  const requestId = Math.random().toString(36).substring(2, 15);

  return new Promise<CallToolResult>((resolve, reject) => {
    // Set a 15-second timeout to clean up stale requests
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Tool execution timed out in the browser bridge (15s limit).`));
    }, 15000);

    // Track request
    pendingRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
      timeout,
    });

    // Forward the JSON-RPC call down the WebSocket to the browser
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: request.params.name,
          arguments: request.params.arguments,
        },
      })
    );
  });
});

// SSE Transport Instance Registry (key: sessionID -> SSEServerTransport)
const activeTransports = new Map<string, SSEServerTransport>();

// SSE Endpoint for OpenAI / Microsoft Client Connection
app.get("/sse", (req, res) => {
  console.log("New SSE connection requested.");
  const sessionId = Math.random().toString(36).substring(2, 15);
  
  // SSE transport expects endpoints configured to handle message postbacks
  const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
  activeTransports.set(sessionId, transport);

  mcpServer.connect(transport).catch((err) => {
    console.error("Error connecting MCP server to transport:", err);
  });

  req.on("close", () => {
    console.log(`SSE connection closed for session: ${sessionId}`);
    activeTransports.delete(sessionId);
  });
});

// Messages Endpoint for MCP Client Payload Postbacks
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = activeTransports.get(sessionId);
  
  if (!transport) {
    res.status(400).send("Invalid or expired session ID.");
    return;
  }

  await transport.handleMessage(req, res);
});

// HTTP Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    adapter: "boarderless-remote-adapter",
    version: "0.1.26",
    activeBridgesCount: activeBridges.size,
  });
});

// Upgrade HTTP Server to handle WebSocket bridge pairing
httpServer.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  
  if (url.pathname === "/bridge") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Handle WebSocket Bridge Connection and pairing
wss.on("connection", (ws, request) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const userId = url.searchParams.get("userId") || "joel-mccracken";

  console.log(`Browser bridge paired for user: ${userId}`);
  
  // Close any existing stale bridge for this user (Visible tab binding rule)
  const existing = activeBridges.get(userId);
  if (existing) {
    existing.close(1000, "Superceded by a new browser tab pairing.");
  }

  activeBridges.set(userId, ws);

  ws.on("message", (messageData) => {
    try {
      const payload = JSON.parse(messageData.toString());
      
      // Check if it's a response to a pending tool call
      if (payload.id && pendingRequests.has(payload.id)) {
        const pending = pendingRequests.get(payload.id)!;
        pendingRequests.delete(payload.id);

        if (payload.error) {
          pending.reject(new Error(payload.error.message || "Unknown tool call failure."));
        } else {
          pending.resolve(payload.result);
        }
      }
    } catch (err) {
      console.error("Error processing message from browser bridge:", err);
    }
  });

  ws.on("close", () => {
    console.log(`Browser bridge disconnected for user: ${userId}`);
    if (activeBridges.get(userId) === ws) {
      activeBridges.delete(userId);
    }
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error on bridge for user ${userId}:`, err);
  });
});

// Start listening
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Remote adapter server listening on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`WebSocket Bridge endpoint: ws://localhost:${PORT}/bridge`);
});

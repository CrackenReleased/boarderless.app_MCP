import fs from 'fs';
import path from 'path';
import module from 'module';

// 1. Verify build output exists
const distPath = path.resolve('dist/extension.js');
if (!fs.existsSync(distPath)) {
    console.error("FAIL: dist/extension.js does not exist");
    process.exit(1);
}
console.log("PASS: dist/extension.js exists");

// 2. Mock vscode API
const registeredProviders = {};
const registeredCommands = {};

const mockVscode = {
    ExtensionContext: {},
    lm: {
        registerMcpServerDefinitionProvider(id, provider) {
            console.log(`Mock: Registering MCP server definition provider for ID: ${id}`);
            registeredProviders[id] = provider;
            return { dispose() {} };
        }
    },
    commands: {
        registerCommand(id, cmd) {
            console.log(`Mock: Registering VS Code command: ${id}`);
            registeredCommands[id] = cmd;
            return { dispose() {} };
        }
    },
    workspace: {
        getConfiguration() {
            return {
                get(key) {
                    if (key === 'appUrl') return 'https://boarderless.app/canvas';
                    if (key === 'browserUrl') return 'http://127.0.0.1:9222';
                    if (key === 'workspaceDir') return 'E:/mock-workspace';
                    return undefined;
                }
            };
        }
    },
    McpStdioServerDefinition: class {
        constructor(label, command, args, env) {
            this.label = label;
            this.command = command;
            this.args = args;
            this.env = env;
        }
    }
};

// Intercept module load for 'vscode'
const originalRequire = module.prototype.require;
module.prototype.require = function (id) {
    if (id === 'vscode') {
        return mockVscode;
    }
    return originalRequire.apply(this, arguments);
};

// 3. Load compiled bundle and activate
try {
    const extension = await import('file://' + distPath);
    const mockContext = {
        subscriptions: [],
        asAbsolutePath(relativePath) {
            return path.join('E:/boarderless-vscode', relativePath);
        }
    };
    
    extension.activate(mockContext);
    
    // Assert provider registered
    if (!registeredProviders['boarderless.mcp-provider']) {
        console.error("FAIL: boarderless.mcp-provider not registered");
        process.exit(1);
    }
    console.log("PASS: boarderless.mcp-provider registered successfully");
    
    // Assert command registered
    if (!registeredCommands['boarderless.launchDebugBrowser']) {
        console.error("FAIL: boarderless.launchDebugBrowser command not registered");
        process.exit(1);
    }
    console.log("PASS: boarderless.launchDebugBrowser command registered successfully");
    
    // Test providing definition
    const provider = registeredProviders['boarderless.mcp-provider'];
    const definitions = await provider.provideMcpServerDefinitions();
    
    if (definitions.length !== 1) {
        console.error("FAIL: Expected 1 MCP definition, got " + definitions.length);
        process.exit(1);
    }
    
    const def = definitions[0];
    if (def.label !== 'Boarderless Canvas') {
        console.error("FAIL: Incorrect definition label: " + def.label);
        process.exit(1);
    }
    
    if (def.command !== 'node') {
        console.error("FAIL: Incorrect definition command: " + def.command);
        process.exit(1);
    }
    
    const normalizedPath = def.args[0].replace(/\\/g, '/');
    if (!normalizedPath.endsWith('server/mcp-stdio-server.js')) {
        console.error("FAIL: Incorrect definition path (expected it to end with server/mcp-stdio-server.js): " + normalizedPath);
        process.exit(1);
    }
    
    if (def.env.BOARDERLESS_MCP_APP_URL !== 'https://boarderless.app/canvas') {
        console.error("FAIL: Incorrect BOARDERLESS_MCP_APP_URL in env");
        process.exit(1);
    }
    
    console.log("PASS: MCP definition structure successfully validated!");
    console.log("ALL EXTENSION TESTS PASSED");
    process.exit(0);
} catch (e) {
    console.error("FAIL: Error executing extension bundle: ", e);
    process.exit(1);
}

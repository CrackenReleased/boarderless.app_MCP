import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    // 1. Register the MCP Server Definition Provider
    const provider = vscode.lm.registerMcpServerDefinitionProvider('boarderless.mcp-provider', {
        provideMcpServerDefinitions: async () => {
            const config = vscode.workspace.getConfiguration('boarderless.mcp');
            
            const appUrl = config.get<string>('appUrl') || 'https://boarderless.app/canvas';
            const browserUrl = config.get<string>('browserUrl') || 'http://127.0.0.1:9222';
            let workspaceDir = config.get<string>('workspaceDir') || '';

            // Fallback: If workspaceDir is not configured, try to use the first open workspace folder
            if (!workspaceDir && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                workspaceDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
            }

            // Path to the stdio server inside the npm package dependency
            const serverPath = context.asAbsolutePath('server/mcp-stdio-server.js');

            const env: Record<string, string> = {
                BOARDERLESS_MCP_APP_URL: appUrl,
                BOARDERLESS_MCP_BROWSER_URL: browserUrl
            };

            if (workspaceDir) {
                env.BOARDERLESS_WORKSPACE_DIR = workspaceDir;
            }

            return [
                new vscode.McpStdioServerDefinition(
                    'Boarderless Canvas',
                    'node',
                    [serverPath],
                    env
                )
            ];
        }
    });

    context.subscriptions.push(provider);

    // 2. Register commands to help the user launch a remote-debugging Chromium instance
    const launchBrowserCmd = vscode.commands.registerCommand('boarderless.launchDebugBrowser', () => {
        const config = vscode.workspace.getConfiguration('boarderless.mcp');
        const appUrl = config.get<string>('appUrl') || 'https://boarderless.app/canvas';
        const browserUrl = config.get<string>('browserUrl') || 'http://127.0.0.1:9222';
        
        let port = '9222';
        try {
            const urlObj = new URL(browserUrl);
            port = urlObj.port || '9222';
        } catch (e) {
            // fallback
        }

        vscode.window.showInformationMessage(`Launching Google Chrome on debugging port ${port}...`);

        let cmd = '';
        if (process.platform === 'win32') {
            cmd = `start chrome --remote-debugging-port=${port} --user-data-dir="%LOCALAPPDATA%\\boarderless-mcp-profile" ${appUrl}`;
        } else if (process.platform === 'darwin') {
            cmd = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=${port} --user-data-dir="$HOME/Library/Application\\ Support/boarderless-mcp-profile" ${appUrl}`;
        } else {
            cmd = `google-chrome --remote-debugging-port=${port} --user-data-dir="$HOME/.boarderless-mcp-profile" ${appUrl}`;
        }

        exec(cmd, (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to launch browser: ${err.message}`);
            }
        });
    });

    context.subscriptions.push(launchBrowserCmd);
}

export function deactivate() {}

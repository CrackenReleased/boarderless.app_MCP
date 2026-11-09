import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function validateSafeAppUrl(rawUrl: string): string | null {
    if (typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.length > 2048 || /[\s"'`;&|$<>\\]/.test(trimmed)) {
        return null;
    }
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

export function validateSafeDebugPort(rawBrowserUrl: string): number {
    try {
        const parsed = new URL(rawBrowserUrl);
        if (parsed.port) {
            const p = Number.parseInt(parsed.port, 10);
            if (Number.isInteger(p) && p >= 1 && p <= 65535) {
                return p;
            }
        }
    } catch {
        // fallback to 9222
    }
    return 9222;
}

function resolveBrowserExecutable(): string | null {
    if (process.platform === 'win32') {
        const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
        const progFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const candidates = [
            path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(progFiles86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            path.join(progFiles86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }
        return null;
    }
    if (process.platform === 'darwin') {
        const candidates = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }
        return null;
    }
    const linuxCandidates = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ];
    for (const candidate of linuxCandidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function resolveMcpProfileDir(): string {
    if (process.platform === 'win32') {
        const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        return path.join(base, 'boarderless-mcp-profile');
    }
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'boarderless-mcp-profile');
    }
    return path.join(os.homedir(), '.boarderless-mcp-profile');
}

export function activate(context: vscode.ExtensionContext) {
    // 1. Register the MCP Server Definition Provider
    const provider = vscode.lm.registerMcpServerDefinitionProvider('boarderless.mcp-provider', {
        provideMcpServerDefinitions: async () => {
            const config = vscode.workspace.getConfiguration('boarderless.mcp');
            
            const rawAppUrl = config.get<string>('appUrl') || 'https://boarderless.app/canvas';
            const appUrl = validateSafeAppUrl(rawAppUrl) || 'https://boarderless.app/canvas';
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
        const rawAppUrl = config.get<string>('appUrl') || 'https://boarderless.app/canvas';
        const safeAppUrl = validateSafeAppUrl(rawAppUrl);
        if (!safeAppUrl) {
            vscode.window.showErrorMessage('Blocked unsafe boarderless.mcp.appUrl setting. Must be a valid http:// or https:// URL.');
            return;
        }

        const browserUrl = config.get<string>('browserUrl') || 'http://127.0.0.1:9222';
        const port = validateSafeDebugPort(browserUrl);
        const browserExe = resolveBrowserExecutable();
        if (!browserExe) {
            vscode.window.showErrorMessage('Could not locate Google Chrome, Chromium, or Microsoft Edge on this machine.');
            return;
        }

        const profileDir = resolveMcpProfileDir();
        vscode.window.showInformationMessage(`Launching browser on debugging port ${port}...`);

        try {
            const child = spawn(
                browserExe,
                [
                    `--remote-debugging-port=${port}`,
                    `--user-data-dir=${profileDir}`,
                    '--no-first-run',
                    '--no-default-browser-check',
                    safeAppUrl,
                ],
                {
                    detached: true,
                    stdio: 'ignore',
                    shell: false,
                }
            );
            child.on('error', (err) => {
                vscode.window.showErrorMessage(`Failed to launch browser: ${err.message}`);
            });
            child.unref();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Failed to launch browser: ${msg}`);
        }
    });

    context.subscriptions.push(launchBrowserCmd);
}

export function deactivate() {}

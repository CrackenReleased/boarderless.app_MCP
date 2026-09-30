import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_ROOT = path.resolve(__dirname, '..');

console.log('===============================================================');
console.log('🧪 VERIFYING MCP UPDATER, WINGET PIPELINE & OPENING AWARENESS');
console.log('===============================================================\n');

// 1. Cargo.toml dependency & branding assertions
const cargoTomlPath = path.join(MCP_ROOT, 'src-tauri', 'Cargo.toml');
const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');

assert(cargoToml.includes('tauri-plugin-updater'), 'Cargo.toml must include tauri-plugin-updater');
assert(cargoToml.includes('tauri-plugin-process'), 'Cargo.toml must include tauri-plugin-process');
assert(cargoToml.includes('CrackenReleased'), 'Cargo.toml must specify CrackenReleased in authors');
assert(!cargoToml.includes('authors = ["you"]'), 'Default template author must not remain');
console.log('✓ Cargo.toml updater dependencies and CrackenReleased branding verified.');

// 2. Capabilities assertions
const capPath = path.join(MCP_ROOT, 'src-tauri', 'capabilities', 'default.json');
const capJson = JSON.parse(fs.readFileSync(capPath, 'utf8'));

assert(capJson.permissions.includes('updater:default'), 'capabilities/default.json must include updater:default');
assert(capJson.permissions.includes('process:allow-restart'), 'capabilities/default.json must include process:allow-restart');
console.log('✓ capabilities/default.json permissions for updater and process restart verified.');

// 3. tauri.conf.json updater & bundle assertions
const tauriConfPath = path.join(MCP_ROOT, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

assert(tauriConf.plugins?.updater?.endpoints?.length > 0, 'tauri.conf.json must configure updater endpoint');
assert(tauriConf.plugins?.updater?.pubkey, 'tauri.conf.json must configure updater pubkey');
assert.strictEqual(tauriConf.bundle?.publisher, 'Cracken Released, LLC.', 'Publisher must be Cracken Released, LLC.');
assert(tauriConf.bundle?.copyright?.includes('Cracken Released, LLC.'), 'Copyright must belong to Cracken Released, LLC.');
console.log('✓ tauri.conf.json updater endpoints and Cracken Released, LLC. publisher verified.');

// 4. src-tauri/src/lib.rs commands & plugin registrations
const libRsPath = path.join(MCP_ROOT, 'src-tauri', 'src', 'lib.rs');
const libRs = fs.readFileSync(libRsPath, 'utf8');

assert(libRs.includes('check_for_updates'), 'lib.rs must define check_for_updates command');
assert(libRs.includes('install_update_and_relaunch'), 'lib.rs must define install_update_and_relaunch command');
assert(libRs.includes('tauri_plugin_updater::Builder'), 'lib.rs must register updater plugin');
assert(libRs.includes('tauri_plugin_process::init'), 'lib.rs must register process plugin');
console.log('✓ src-tauri/src/lib.rs updater handlers and plugin registrations verified.');

// 5. ui/index.html opening awareness & update banner
const uiIndexPath = path.join(MCP_ROOT, 'ui', 'index.html');
const uiIndex = fs.readFileSync(uiIndexPath, 'utf8');

assert(uiIndex.includes('id="mcp-update-banner"'), 'ui/index.html must include mcp-update-banner');
assert(uiIndex.includes('checkForAvailableUpdates'), 'ui/index.html must define checkForAvailableUpdates()');
assert(uiIndex.includes('installUpdateNow'), 'ui/index.html must define installUpdateNow()');
assert(uiIndex.includes('CrackenReleased.BoarderlessMCP'), 'ui/index.html must display CrackenReleased.BoarderlessMCP winget command');
console.log('✓ ui/index.html opening awareness update banner and winget guidance verified.');

// 6. Winget Manifest package existence & integrity
const manifestDir = path.join(MCP_ROOT, 'distribution', 'winget', 'manifests', 'c', 'CrackenReleased', 'BoarderlessMCP', '0.1.29');
const versionYaml = path.join(manifestDir, 'CrackenReleased.BoarderlessMCP.yaml');
const installerYaml = path.join(manifestDir, 'CrackenReleased.BoarderlessMCP.installer.yaml');
const localeYaml = path.join(manifestDir, 'CrackenReleased.BoarderlessMCP.locale.en-US.yaml');

assert(fs.existsSync(versionYaml), 'Version manifest must exist');
assert(fs.existsSync(installerYaml), 'Installer manifest must exist');
assert(fs.existsSync(localeYaml), 'Locale manifest must exist');

const installerContent = fs.readFileSync(installerYaml, 'utf8');
assert(installerContent.includes('PackageIdentifier: CrackenReleased.BoarderlessMCP'), 'Installer manifest must have PackageIdentifier CrackenReleased.BoarderlessMCP');
assert(installerContent.includes('InstallerSha256: 1C0A4E60D64ADA2600260B93EFE8E5EC87127130B5CB25015C024155A4B0DD1D'), 'Installer manifest must include valid setup.exe SHA-256');

const localeContent = fs.readFileSync(localeYaml, 'utf8');
assert(localeContent.includes('Publisher: Cracken Released, LLC.'), 'Locale manifest must have Publisher Cracken Released, LLC.');
console.log('✓ Winget manifest package (CrackenReleased.BoarderlessMCP) verified.');

// 7. GitHub Actions release workflow
const workflowPath = path.join(MCP_ROOT, '.github', 'workflows', 'release.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

assert(workflow.includes('publish-winget:'), 'release.yml must include publish-winget job');
assert(workflow.includes('CrackenReleased.BoarderlessMCP'), 'release.yml must publish CrackenReleased.BoarderlessMCP');
console.log('✓ .github/workflows/release.yml automated winget publishing job verified.');

console.log('\n===============================================================');
console.log('🎉 ALL MCP UPDATER & WINGET VERIFICATION TESTS PASSED (7/7)!');
console.log('===============================================================\n');

assert.strictEqual(tauriConf.bundle.createUpdaterArtifacts, true, 'signed MCP update artifacts must be emitted');
assert(workflow.includes('TAURI_SIGNING_PRIVATE_KEY:') && workflow.includes('includeUpdaterJson: true'), 'release must sign and publish latest.json');
assert(workflow.includes('release-tag:') && workflow.includes('WINGET_REGISTERED'), 'WinGet automation requires a registered package and exact release tag');
assert(installerContent.includes('Boarderless.MCP_0.1.29_x64-setup.exe'), 'manifest URL must match actual published installer');
assert(installerContent.includes('1C0A4E60D64ADA2600260B93EFE8E5EC87127130B5CB25015C024155A4B0DD1D'), 'manifest hash must match published GitHub asset digest');

assert(uiIndex.includes('"command": "npx"') && uiIndex.includes('"args": ["-y", p]'), 'Installed client config must use the published npm connector, not an unbundled development path');
assert(uiIndex.includes("const p = '@boarderless/mcp-server@latest'"), 'Copied client config must work without a source checkout');

const shortcutTest = fs.readFileSync(path.join(MCP_ROOT, 'src/verify_shortcut.js'), 'utf8');
assert(!shortcutTest.includes("path.join(rootDir, 'setup.exe')"), 'CI source tests must not require an ignored developer installer');

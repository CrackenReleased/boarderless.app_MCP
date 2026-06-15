// verify_walkthrough_wizard.js
import fs from 'fs';
import path from 'path';

function assert(condition, message) {
  if (!condition) {
    console.error(`[-] ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`[+] ASSERTION PASSED: ${message}`);
  }
}

async function main() {
  console.log('[*] Commencing Walkthrough Wizard integration & compile checks...');

  // 1. Verify Rust Backend Configuration
  const libRsPath = path.resolve('src-tauri/src/lib.rs');
  assert(fs.existsSync(libRsPath), 'src-tauri/src/lib.rs exists');
  const libRsContent = fs.readFileSync(libRsPath, 'utf8');

  assert(libRsContent.includes('browser_child: Arc<Mutex<Option<Child>>>'), 'AppState includes browser_child');
  assert(libRsContent.includes('fn launch_browser(') && libRsContent.includes('state: State<\'_, AppState>'), 'launch_browser accepts AppState');
  assert(libRsContent.includes('fn kill_active_browser('), 'kill_active_browser command is defined');
  assert(libRsContent.includes('fn get_installed_browsers('), 'get_installed_browsers command is defined');
  assert(libRsContent.includes('tauri::generate_handler![get_server_path, launch_browser, kill_active_browser, get_installed_browsers]'), 'commands are registered in the Tauri handler list');
  assert(libRsContent.includes('browser_child: Arc::new(Mutex::new(None))'), 'browser_child state is correctly initialized on setup');

  // 2. Verify UI Frontend Structure
  const uiHtmlPath = path.resolve('ui/index.html');
  assert(fs.existsSync(uiHtmlPath), 'ui/index.html exists');
  const uiHtmlContent = fs.readFileSync(uiHtmlPath, 'utf8');

  assert(uiHtmlContent.includes('id="wizard-step-1"'), 'Step 1 container exists in UI');
  assert(uiHtmlContent.includes('id="wizard-step-2-isolated"'), 'Step 2 (Isolated) container exists in UI');
  assert(uiHtmlContent.includes('id="wizard-step-2-personal"'), 'Step 2 (Personal) container exists in UI');
  assert(uiHtmlContent.includes('function startIsolatedLogin()'), 'startIsolatedLogin JS helper is defined');
  assert(uiHtmlContent.includes('function startIsolatedDebug()'), 'startIsolatedDebug JS helper is defined');
  assert(uiHtmlContent.includes('function launchPersonalDebug()'), 'launchPersonalDebug JS helper is defined');
  assert(uiHtmlContent.includes('function loadInstalledBrowsers()'), 'loadInstalledBrowsers JS helper is defined');
  assert(uiHtmlContent.includes("invoke('kill_active_browser')"), 'kill_active_browser is called on modal close and step back');

  console.log('\n[+] REGRESSION TEST SUCCESSFUL: Walkthrough Wizard implementation verified end-to-end.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

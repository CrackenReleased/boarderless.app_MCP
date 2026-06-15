import puppeteer from 'puppeteer-core';

async function main() {
  const browserURL = 'http://127.0.0.1:9222';
  console.log(`[+] Connecting to debug Chrome at ${browserURL}...`);
  
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL, defaultViewport: null });
  } catch (err) {
    console.error('[-] Failed to connect to Chrome. Make sure Chrome is open and listening on port 9222.');
    return;
  }
  
  console.log('[+] Connected successfully.');
  
  // Find Boarderless tab
  let page = null;
  const pages = await browser.pages();
  for (const p of pages) {
    const url = p.url();
    if (url.includes('boarderless.app/canvas') || url.includes('5174/canvas')) {
      page = p;
      break;
    }
  }
  
  if (!page) {
    console.log('[*] Boarderless canvas page not found. Opening a new tab to https://boarderless.app/canvas...');
    page = await browser.newPage();
    await page.goto('https://boarderless.app/canvas', { waitUntil: 'domcontentloaded' });
  } else {
    console.log(`[+] Found active tab: ${page.url()}`);
  }

  // Clear any existing device metrics or viewport overrides to ensure full desktop layout
  try {
    const client = await page.createCDPSession();
    await client.send('Emulation.clearDeviceMetricsOverride');
    console.log('[+] Cleared any device metrics/viewport constraints.');
  } catch (e) {
    console.warn('[!] Failed to clear device metrics override:', e.message);
  }

  // Setup auto-approve loop in the page context just in case MCP fallback is needed
  await page.evaluateOnNewDocument(() => {
    setInterval(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.trim() === 'Allow') {
          btn.click();
        }
      }
    }, 50);
  });

  // Inject it to the current page session as well (in case it is already loaded)
  await page.evaluate(() => {
    window._mcpAutoApproveInterval = setInterval(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.trim() === 'Allow') {
          btn.click();
        }
      }
    }, 50);
  });

  console.log('[*] Waiting for canvas loading...');
  
  // Wait for boarderlessMcp global or react-root to indicate app has mounted
  await page.waitForFunction(() => Boolean(window.boarderlessMcp), { timeout: 60000 });
  
  // Check if login screen is active
  let isLoginActive = await page.evaluate(() => Boolean(document.querySelector('.login-screen-container')));
  if (isLoginActive) {
    console.log('\n================================================================');
    console.log('[!] AUTHENTICATION REQUIRED');
    console.log('Please sign in using Google in your Chrome window.');
    console.log('We will automatically start drawing once you enter the canvas...');
    console.log('================================================================\n');
    
    // Poll until login screen disappears and stage-wrap appears
    while (isLoginActive) {
      await new Promise(r => setTimeout(r, 1000));
      isLoginActive = await page.evaluate(() => Boolean(document.querySelector('.login-screen-container')));
    }
  }

  // Dismiss or accept Pro Cloud Sync Dialog if active
  await page.evaluate(async () => {
    for (let i = 0; i < 15; i++) {
      const backdrop = document.querySelector('.pro-sync-prompt-backdrop');
      if (backdrop) {
        const enableBtn = backdrop.querySelector('.pro-sync-enable');
        if (enableBtn) {
          enableBtn.click();
        } else {
          const laterBtn = backdrop.querySelector('.pro-sync-later');
          if (laterBtn) laterBtn.click();
        }
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  });

  // Wait for canvas elements to render
  console.log('[*] Waiting for canvas layout container to mount...');
  await page.waitForSelector('#stage-wrap', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000)); // small grace period for stores to hydrate

  console.log('[*] Commencing layout extraction and rendering...');

  const drawResult = await page.evaluate(async () => {
    try {
      // 1. Recursive finder to extract Zustand stores from React 18 Fiber
      function findStores() {
        const rootEl = document.getElementById('react-root');
        if (!rootEl) return null;
        const key = Object.keys(rootEl).find(k => k.startsWith('__reactContainer$'));
        if (!key) return null;
        const fiber = rootEl[key];
        
        const stores = {};
        const visited = new Set();
        
        function search(obj, depth = 0) {
          if (depth > 12) return;
          if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return;
          if (visited.has(obj)) return;
          visited.add(obj);
          
          if (typeof obj.getState === 'function' && typeof obj.setState === 'function' && typeof obj.subscribe === 'function') {
            const state = obj.getState();
            if (state) {
              if (typeof state.setBackgroundColor === 'function') {
                stores.useAppStore = obj;
              } else if (typeof state.addNode === 'function' && state.nodes) {
                stores.useShapeToolStore = obj;
              } else if (typeof state.upsertTextNode === 'function') {
                stores.useTextToolStore = obj;
              } else if (typeof state.updateNode === 'function' && state.assets) {
                stores.useGalleryStore = obj;
              } else if (typeof state.createBoard === 'function') {
                stores.useBoardsStore = obj;
              } else if (state.hasOwnProperty('isAuthenticated')) {
                stores.useAuthStore = obj;
              }
            }
          }
          
          try {
            const keys = Object.keys(obj);
            for (const k of keys) {
              if (k === 'window' || k === 'document' || k === 'view' || k === 'stage' || k === 'contentLayer') continue;
              search(obj[k], depth + 1);
            }
          } catch (e) {}
          
          try {
            const proto = Object.getPrototypeOf(obj);
            if (proto) search(proto, depth + 1);
          } catch (e) {}
        }
        
        function traverseFiber(node) {
          if (!node) return;
          search(node.memoizedState);
          search(node.memoizedProps);
          search(node.stateNode);
          if (node.child) traverseFiber(node.child);
          if (node.sibling) traverseFiber(node.sibling);
        }
        
        traverseFiber(fiber.current);
        return stores;
      }

      const stores = findStores() || {};
      const canUseStores = Boolean(stores.useShapeToolStore && stores.useAppStore);
      console.log('[MCP Loader] Direct stores found:', Object.keys(stores));

      // 2. Set Background Color
      if (canUseStores) {
        stores.useAppStore.getState().setBackgroundColor('#0d0b18');
      } else {
        document.body.style.background = '#0d0b18';
      }

      // Helper function to add/create shape
      let currentZIndex = 100;
      const getZ = () => currentZIndex++;
      
      const centerX = 0;
      const centerY = 0;

      async function addShape(shape) {
        if (canUseStores) {
          // Add directly via Shape Tool Store
          stores.useShapeToolStore.getState().addNode({
            ...shape,
            zIndex: getZ(),
            sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
          });
        } else {
          // Fallback to MCP tool execution
          await window.boarderlessMcp.callTool('create_object', {
            type: shape.type,
            x: shape.x,
            y: shape.y,
            width: shape.width || (shape.radiusX * 2),
            height: shape.height || (shape.radiusY * 2),
            fill: shape.fill,
            stroke: shape.stroke,
            strokeWidth: shape.strokeWidth
          });
          // Mutate rotation/opacity if special properties exist and it is not default
          if (shape.rotation !== 0 || shape.opacity !== 1) {
            // Retrieve latest state to find new object ID
            const snap = await window.boarderlessMcp.getSnapshot();
            // Get the last added object
            const lastObj = snap.objects[snap.objects.length - 1];
            if (lastObj) {
              await window.boarderlessMcp.callTool('mutate_object', {
                id: lastObj.id,
                rotation: shape.rotation,
                opacity: shape.opacity
              });
            }
          }
        }
      }

      // Draw the pattern shapes!
      
      // 1. Concentric Skewed Rings (ellipses)
      const ellipsesCount = 12;
      for (let i = 0; i < ellipsesCount; i++) {
        const radiusX = 130 + i * 14;
        const radiusY = 70 + i * 8;
        const isSpecial = i % 3 === 0;
        const strokeColor = isSpecial ? '#ffffff' : '#c084fc';
        const opacity = isSpecial ? 0.65 : 0.35;
        const strokeWidth = isSpecial ? 2 : 1;

        await addShape({
          id: `mcp_ring_${i}_${Date.now()}`,
          type: 'ellipse',
          x: centerX,
          y: centerY,
          radiusX,
          radiusY,
          stroke: strokeColor,
          strokeWidth,
          fill: null,
          opacity,
          rotation: -30,
          scaleX: 1,
          scaleY: 1
        });
      }

      // 2. Vertical Background Trails (cyber track lines)
      // Left vertical tracks
      for (let i = 0; i < 6; i++) {
        const lineX = 350 + i * 16;
        await addShape({
          id: `mcp_vtrack_l_${i}_${Date.now()}`,
          type: 'rect',
          x: lineX - 600,
          y: -270,
          width: 3,
          height: 540,
          fill: '#7c3aed',
          strokeWidth: 0,
          stroke: null,
          opacity: 0.45,
          rotation: 0
        });
      }

      // Right vertical tracks
      for (let i = 0; i < 6; i++) {
        const lineX = 730 + i * 16;
        await addShape({
          id: `mcp_vtrack_r_${i}_${Date.now()}`,
          type: 'rect',
          x: lineX - 600,
          y: -220,
          width: 3,
          height: 520,
          fill: '#7c3aed',
          strokeWidth: 0,
          stroke: null,
          opacity: 0.45,
          rotation: 0
        });
      }

      // 3. Diagonal purple bands
      const bandYOffsets = [-180, -140, 140, 180];
      for (let idx = 0; idx < bandYOffsets.length; idx++) {
        const offset = bandYOffsets[idx];
        await addShape({
          id: `mcp_diag_band_${idx}_${Date.now()}`,
          type: 'rect',
          x: centerX + offset * Math.sin(30 * Math.PI / 180),
          y: centerY + offset * Math.cos(30 * Math.PI / 180),
          width: 1000,
          height: 4,
          fill: '#6d28d9',
          strokeWidth: 0,
          stroke: null,
          opacity: 0.5,
          rotation: -30
        });
      }

      // Broad background purple shards for depth
      await addShape({
        id: `mcp_bg_purple_broad_1_${Date.now()}`,
        type: 'rect',
        x: centerX - 200,
        y: centerY - 100,
        width: 600,
        height: 35,
        fill: '#5b21b6',
        strokeWidth: 0,
        stroke: null,
        opacity: 0.25,
        rotation: 40
      });

      await addShape({
        id: `mcp_bg_purple_broad_2_${Date.now()}`,
        type: 'rect',
        x: centerX + 100,
        y: centerY - 200,
        width: 600,
        height: 35,
        fill: '#5b21b6',
        strokeWidth: 0,
        stroke: null,
        opacity: 0.25,
        rotation: -40
      });

      // 4. Central Spire/Needle
      // Glowing backing
      await addShape({
        id: `mcp_spire_glow_top_${Date.now()}`,
        type: 'rect',
        x: centerX - 6 * Math.sin(30 * Math.PI / 180),
        y: centerY - 6 * Math.cos(30 * Math.PI / 180),
        width: 900,
        height: 2,
        fill: '#22d3ee',
        strokeWidth: 0,
        stroke: null,
        opacity: 0.7,
        rotation: -30
      });

      await addShape({
        id: `mcp_spire_glow_bottom_${Date.now()}`,
        type: 'rect',
        x: centerX + 6 * Math.sin(30 * Math.PI / 180),
        y: centerY + 6 * Math.cos(30 * Math.PI / 180),
        width: 900,
        height: 2,
        fill: '#22d3ee',
        strokeWidth: 0,
        stroke: null,
        opacity: 0.7,
        rotation: -30
      });

      // Main core white needle
      await addShape({
        id: `mcp_spire_white_core_${Date.now()}`,
        type: 'rect',
        x: centerX,
        y: centerY,
        width: 960,
        height: 4,
        fill: '#ffffff',
        strokeWidth: 0,
        stroke: null,
        opacity: 1,
        rotation: -30
      });

      // Needle tips (triangles)
      await addShape({
        id: `mcp_spire_tip_tr_${Date.now()}`,
        type: 'triangle',
        x: 415.7,
        y: -240,
        width: 20,
        height: 50,
        fill: '#ffffff',
        stroke: '#22d3ee',
        strokeWidth: 2,
        opacity: 1,
        rotation: 60
      });

      await addShape({
        id: `mcp_spire_tip_bl_${Date.now()}`,
        type: 'triangle',
        x: -415.7,
        y: 240,
        width: 20,
        height: 50,
        fill: '#ffffff',
        stroke: '#22d3ee',
        strokeWidth: 2,
        opacity: 1,
        rotation: 240
      });

      // 5. Cyan junction squares
      const nodeCoords = [
        { x: -186, y: -120 },
        { x: -170, y: -120 },
        { x: 146, y: 130 },
        { x: 162, y: 130 },
        { x: -100, y: -60 },
        { x: 100, y: 60 }
      ];

      for (let idx = 0; idx < nodeCoords.length; idx++) {
        const nc = nodeCoords[idx];
        await addShape({
          id: `mcp_cyan_node_${idx}_${Date.now()}`,
          type: 'rect',
          x: nc.x,
          y: nc.y,
          width: 10,
          height: 10,
          fill: '#22d3ee',
          stroke: '#ffffff',
          strokeWidth: 1,
          opacity: 0.9,
          rotation: 0
        });
      }

      // 6. Dot matrix sensor arrays
      // Left 4x4 dot grid
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          await addShape({
            id: `mcp_dot_grid_1_${r}_${c}_${Date.now()}`,
            type: 'ellipse',
            x: -120 + c * 14,
            y: 100 + r * 14,
            radiusX: 2.5,
            radiusY: 2.5,
            fill: '#22d3ee',
            strokeWidth: 0,
            stroke: null,
            opacity: 0.85,
            rotation: 0
          });
        }
      }

      // Right 4x4 dot grid
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          await addShape({
            id: `mcp_dot_grid_2_${r}_${c}_${Date.now()}`,
            type: 'ellipse',
            x: 80 + c * 14,
            y: -100 + r * 14,
            radiusX: 2.5,
            radiusY: 2.5,
            fill: '#22d3ee',
            strokeWidth: 0,
            stroke: null,
            opacity: 0.85,
            rotation: 0
          });
        }
      }

      // 7. Plus sign accents (+)
      const plusCoords = [
        { x: -220, y: -140 },
        { x: 220, y: 140 }
      ];

      for (let idx = 0; idx < plusCoords.length; idx++) {
        const pc = plusCoords[idx];
        // Horizontal
        await addShape({
          id: `mcp_plus_h_${idx}_${Date.now()}`,
          type: 'rect',
          x: pc.x,
          y: pc.y,
          width: 14,
          height: 2,
          fill: '#22d3ee',
          strokeWidth: 0,
          stroke: null,
          opacity: 0.9,
          rotation: 0
        });
        // Vertical
        await addShape({
          id: `mcp_plus_v_${idx}_${Date.now()}`,
          type: 'rect',
          x: pc.x + 6,
          y: pc.y - 6,
          width: 2,
          height: 14,
          fill: '#22d3ee',
          strokeWidth: 0,
          stroke: null,
          opacity: 0.9,
          rotation: 0
        });
      }

      // 8. Circle accents
      const circleCoords = [
        { x: -80, y: -140, r: 12 },
        { x: 80, y: 140, r: 12 }
      ];

      for (let idx = 0; idx < circleCoords.length; idx++) {
        const cc = circleCoords[idx];
        await addShape({
          id: `mcp_accent_circle_${idx}_${Date.now()}`,
          type: 'ellipse',
          x: cc.x,
          y: cc.y,
          radiusX: cc.r,
          radiusY: cc.r,
          stroke: '#22d3ee',
          strokeWidth: 1.5,
          fill: null,
          opacity: 0.8,
          rotation: 0
        });
      }

      // 9. Rename the active board to AgentBoard## using Zustand or DOM simulation
      try {
        if (stores.useBoardsStore) {
          const currentBoardId = stores.useBoardsStore.getState().currentBoardId;
          const boards = stores.useBoardsStore.getState().boards;
          const names = boards.map(b => b.name);
          let num = 1;
          while (names.includes(`AgentBoard${num.toString().padStart(2, '0')}`)) {
            num++;
          }
          const newName = `AgentBoard${num.toString().padStart(2, '0')}`;
          await stores.useBoardsStore.getState().renameBoard(currentBoardId, newName);
          console.log(`[+] Renamed board to ${newName} via Zustand store.`);
        } else {
          // DOM fallback with React property setter
          let input = document.querySelector('.board-tab-input');
          if (!input) {
            const activeTabBtn = document.querySelector('.board-tab.is-active .board-tab-btn');
            if (activeTabBtn) {
              activeTabBtn.click();
              await new Promise(r => setTimeout(r, 200));
              input = document.querySelector('.board-tab-input');
            }
          }
          
          if (input) {
            const tabBtns = Array.from(document.querySelectorAll('.board-tab-btn'));
            const names = tabBtns.map(btn => btn.textContent ? btn.textContent.trim() : '');
            let num = 1;
            while (names.includes(`AgentBoard${num.toString().padStart(2, '0')}`)) {
              num++;
            }
            const newName = `AgentBoard${num.toString().padStart(2, '0')}`;
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, newName);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Dispatch Enter keypress to trigger React commit
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            input.blur();
            console.log(`[+] Renamed board to ${newName} via DOM simulation.`);
          }
        }
      } catch (e) {
        console.warn('Failed to rename board:', e);
      }

      // Redraw stage
      if (window.stage && window.contentLayer) {
        window.stage.batchDraw();
      }

      // If we used direct stores, save the board state locally
      if (canUseStores) {
        // Trigger save state or dispatch board events
        window.dispatchEvent(new CustomEvent('boarderless:syncHintVisibility'));
      }

      return { success: true, storeUsed: canUseStores };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  if (drawResult.success) {
    console.log(`[+] Whimsical T-shirt Pattern layout generated successfully! (Store mode: ${drawResult.storeUsed})`);
  } else {
    console.error('[-] Error drawing pattern:', drawResult.error);
  }

  // Clear auto-approve loop
  await page.evaluate(() => {
    if (window._mcpAutoApproveInterval) clearInterval(window._mcpAutoApproveInterval);
  });

  await browser.disconnect();
}

main().catch(console.error);

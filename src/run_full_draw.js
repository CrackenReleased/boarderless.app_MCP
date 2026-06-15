import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';

async function main() {
  const exePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', 'boarderless-mcp-profile');

  console.log(`[+] Launching Chrome with profile at: ${profilePath}`);
  
  const browser = await puppeteer.launch({
    executablePath: exePath,
    headless: false,
    defaultViewport: null,
    userDataDir: profilePath,
    args: [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized'
    ]
  });

  console.log('[+] Chrome launched successfully.');
  console.log('[+] Navigating to https://boarderless.app/canvas...');
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  await page.goto('https://boarderless.app/canvas', { waitUntil: 'domcontentloaded' });

  // Wait for useAuthStore to be available
  console.log('[*] Waiting for Boarderless app to initialize...');
  await page.waitForFunction(() => Boolean(window.useAuthStore), { timeout: 30000 });
  
  // Verify authentication status
  console.log('[*] Checking authentication status...');
  let isAuthenticated = await page.evaluate(() => {
    return window.useAuthStore.getState().isAuthenticated;
  });
  
  if (!isAuthenticated) {
    console.log('\n================================================================');
    console.log('[!] AUTHENTICATION REQUIRED');
    console.log('Please log in using Google OAuth in the Chrome window.');
    console.log('We will automatically proceed once authentication is complete...');
    console.log('================================================================\n');
    
    while (!isAuthenticated) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        isAuthenticated = await page.evaluate(() => {
          return window.useAuthStore.getState().isAuthenticated;
        });
        if (isAuthenticated) {
          console.log('[+] Authentication verified!');
        }
      } catch (e) {
        // Safe navigation catch
      }
    }
  } else {
    console.log('[+] Already authenticated.');
  }

  // Ensure other stores are fully hydrated
  await page.waitForFunction(() => Boolean(window.useBoardsStore && window.useShapeToolStore && window.useAppStore), { timeout: 15000 });

  // Create new board
  console.log('[*] Creating new board: "Whimsical T-shirt Pattern"...');
  const boardId = await page.evaluate(async () => {
    const newId = await window.useBoardsStore.getState().createBoard('Whimsical T-shirt Pattern');
    return newId;
  });
  
  console.log(`[+] Board created successfully with ID: ${boardId}`);
  await new Promise(r => setTimeout(r, 1500)); // wait for board initialization

  console.log('[*] Drawing the whimsical geometric pattern...');
  
  const drawResult = await page.evaluate(() => {
    try {
      // Set background color
      window.useAppStore.getState().setBackgroundColor('#0d0b18');

      let currentZIndex = 1;
      const getZ = () => currentZIndex++;

      const centerX = 600;
      const centerY = 420;

      // 1. Concentric rings (Saturn space portal)
      const ellipsesCount = 12;
      for (let i = 0; i < ellipsesCount; i++) {
        const radiusX = 130 + i * 14;
        const radiusY = 70 + i * 8;
        const isSpecial = i % 3 === 0;
        const strokeColor = isSpecial ? '#ffffff' : '#c084fc';
        const opacity = isSpecial ? 0.65 : 0.35;
        const strokeWidth = isSpecial ? 2 : 1;

        window.useShapeToolStore.getState().addNode({
          id: `mcp_ring_${i}_${Date.now()}`,
          type: 'ellipse',
          x: centerX,
          y: centerY,
          radiusX,
          radiusY,
          stroke: strokeColor,
          strokeWidth,
          opacity,
          rotation: -30,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      }

      // 2. Vertical background trails (Cyber track lines)
      // Left vertical tracks
      for (let i = 0; i < 6; i++) {
        const lineX = 350 + i * 16;
        window.useShapeToolStore.getState().addNode({
          id: `mcp_vtrack_l_${i}_${Date.now()}`,
          type: 'rect',
          x: lineX,
          y: 150,
          width: 3,
          height: 540,
          fill: '#7c3aed',
          strokeWidth: 0,
          opacity: 0.45,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      }

      // Right vertical tracks
      for (let i = 0; i < 6; i++) {
        const lineX = 730 + i * 16;
        window.useShapeToolStore.getState().addNode({
          id: `mcp_vtrack_r_${i}_${Date.now()}`,
          type: 'rect',
          x: lineX,
          y: 200,
          width: 3,
          height: 520,
          fill: '#7c3aed',
          strokeWidth: 0,
          opacity: 0.45,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      }

      // 3. Diagonal purple bands
      const bandYOffsets = [-180, -140, 140, 180];
      bandYOffsets.forEach((offset, idx) => {
        window.useShapeToolStore.getState().addNode({
          id: `mcp_diag_band_${idx}_${Date.now()}`,
          type: 'rect',
          x: centerX + offset * Math.sin(30 * Math.PI / 180),
          y: centerY + offset * Math.cos(30 * Math.PI / 180),
          width: 1000,
          height: 4,
          fill: '#6d28d9',
          strokeWidth: 0,
          opacity: 0.5,
          rotation: -30,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      });

      // Broad background purple shards for depth
      window.useShapeToolStore.getState().addNode({
        id: `mcp_bg_purple_broad_1_${Date.now()}`,
        type: 'rect',
        x: centerX - 200,
        y: centerY - 100,
        width: 600,
        height: 35,
        fill: '#5b21b6',
        strokeWidth: 0,
        opacity: 0.25,
        rotation: 40,
        scaleX: 1,
        scaleY: 1,
        zIndex: getZ(),
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      });

      window.useShapeToolStore.getState().addNode({
        id: `mcp_bg_purple_broad_2_${Date.now()}`,
        type: 'rect',
        x: centerX + 100,
        y: centerY - 200,
        width: 600,
        height: 35,
        fill: '#5b21b6',
        strokeWidth: 0,
        opacity: 0.25,
        rotation: -40,
        scaleX: 1,
        scaleY: 1,
        zIndex: getZ(),
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      });

      // 4. Central Spire/Needle
      // Glowing backing
      window.useShapeToolStore.getState().addNode({
        id: `mcp_spire_glow_top_${Date.now()}`,
        type: 'rect',
        x: centerX - 6 * Math.sin(30 * Math.PI / 180),
        y: centerY - 6 * Math.cos(30 * Math.PI / 180),
        width: 900,
        height: 2,
        fill: '#22d3ee',
        strokeWidth: 0,
        opacity: 0.7,
        rotation: -30,
        scaleX: 1,
        scaleY: 1,
        zIndex: getZ(),
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      });

      window.useShapeToolStore.getState().addNode({
        id: `mcp_spire_glow_bottom_${Date.now()}`,
        type: 'rect',
        x: centerX + 6 * Math.sin(30 * Math.PI / 180),
        y: centerY + 6 * Math.cos(30 * Math.PI / 180),
        width: 900,
        height: 2,
        fill: '#22d3ee',
        strokeWidth: 0,
        opacity: 0.7,
        rotation: -30,
        scaleX: 1,
        scaleY: 1,
        zIndex: getZ(),
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      });

      // Main core white needle
      window.useShapeToolStore.getState().addNode({
        id: `mcp_spire_white_core_${Date.now()}`,
        type: 'rect',
        x: centerX,
        y: centerY,
        width: 960,
        height: 4,
        fill: '#ffffff',
        strokeWidth: 0,
        opacity: 1,
        rotation: -30,
        scaleX: 1,
        scaleY: 1,
        zIndex: getZ(),
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      });

      // Needle tips (triangles)
      window.useShapeToolStore.getState().addNode({
        id: `mcp_spire_tip_tr_${Date.now()}`,
        type: 'triangle',
        x: 1015.7,
        y: 180,
        width: 20,
        height: 50,
        fill: '#ffffff',
        stroke: '#22d3ee',
        strokeWidth: 2,
        opacity: 1,
        rotation: 60,
        scaleX: 1,
        scaleY: 1,
        zIndex: getZ(),
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      });

      window.useShapeToolStore.getState().addNode({
        id: `mcp_spire_tip_bl_${Date.now()}`,
        type: 'triangle',
        x: 184.3,
        y: 660,
        width: 20,
        height: 50,
        fill: '#ffffff',
        stroke: '#22d3ee',
        strokeWidth: 2,
        opacity: 1,
        rotation: 240,
        scaleX: 1,
        scaleY: 1,
        zIndex: getZ(),
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      });

      // 5. Cyan junction squares
      const nodeCoords = [
        { x: 414, y: 300 },
        { x: 430, y: 300 },
        { x: 746, y: 550 },
        { x: 762, y: 550 },
        { x: 500, y: 360 },
        { x: 700, y: 480 }
      ];

      nodeCoords.forEach((nc, idx) => {
        window.useShapeToolStore.getState().addNode({
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
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      });

      // 6. Dot matrix sensor arrays
      // Left 4x4 dot grid
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          window.useShapeToolStore.getState().addNode({
            id: `mcp_dot_grid_1_${r}_${c}_${Date.now()}`,
            type: 'ellipse',
            x: 480 + c * 14,
            y: 520 + r * 14,
            radiusX: 2.5,
            radiusY: 2.5,
            fill: '#22d3ee',
            strokeWidth: 0,
            opacity: 0.85,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: getZ(),
            sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
          });
        }
      }

      // Right 4x4 dot grid
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          window.useShapeToolStore.getState().addNode({
            id: `mcp_dot_grid_2_${r}_${c}_${Date.now()}`,
            type: 'ellipse',
            x: 680 + c * 14,
            y: 320 + r * 14,
            radiusX: 2.5,
            radiusY: 2.5,
            fill: '#22d3ee',
            strokeWidth: 0,
            opacity: 0.85,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: getZ(),
            sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
          });
        }
      }

      // 7. Plus sign accents (+)
      const plusCoords = [
        { x: 380, y: 280 },
        { x: 820, y: 560 }
      ];

      plusCoords.forEach((pc, idx) => {
        // Horizontal
        window.useShapeToolStore.getState().addNode({
          id: `mcp_plus_h_${idx}_${Date.now()}`,
          type: 'rect',
          x: pc.x,
          y: pc.y,
          width: 14,
          height: 2,
          fill: '#22d3ee',
          strokeWidth: 0,
          opacity: 0.9,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
        // Vertical
        window.useShapeToolStore.getState().addNode({
          id: `mcp_plus_v_${idx}_${Date.now()}`,
          type: 'rect',
          x: pc.x + 6,
          y: pc.y - 6,
          width: 2,
          height: 14,
          fill: '#22d3ee',
          strokeWidth: 0,
          opacity: 0.9,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      });

      // 8. Circle accents
      const circleCoords = [
        { x: 520, y: 280, r: 12 },
        { x: 680, y: 560, r: 12 }
      ];

      circleCoords.forEach((cc, idx) => {
        window.useShapeToolStore.getState().addNode({
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
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      });

      // Redraw stage
      if (window.stage && window.contentLayer) {
        window.stage.batchDraw();
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  if (drawResult.success) {
    console.log('[+] Whimsical T-shirt Pattern layout generated successfully!');
  } else {
    console.error('[-] Error drawing pattern:', drawResult.error);
  }

  console.log('[+] Keeping Chrome open for 5 minutes so you can inspect and save the board.');
  await new Promise(resolve => setTimeout(resolve, 300000));
  
  await browser.close();
}

main().catch(console.error);

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
    console.log('[*] Boarderless canvas page not found. Opening a new tab...');
    page = await browser.newPage();
    await page.goto('https://boarderless.app/canvas', { waitUntil: 'domcontentloaded' });
  } else {
    console.log(`[+] Found active tab: ${page.url()}`);
    console.log('[*] Reloading tab to pull the newly deployed production build...');
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  // Clear device metrics
  try {
    const client = await page.createCDPSession();
    await client.send('Emulation.clearDeviceMetricsOverride');
  } catch (e) {}

  console.log('[*] Waiting for canvas layout container (#stage-wrap)...');
  await page.waitForSelector('#stage-wrap', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  // Helper function to find stores in evaluate contexts
  const findStoresSerialized = `
    function findStores() {
      if (window.useBoardsStore && window.useShapeToolStore && window.useTextToolStore && window.useAppStore && window.useGalleryStore) {
        return {
          useBoardsStore: window.useBoardsStore,
          useShapeToolStore: window.useShapeToolStore,
          useTextToolStore: window.useTextToolStore,
          useAppStore: window.useAppStore,
          useGalleryStore: window.useGalleryStore
        };
      }

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
  `;

  // Create new board
  console.log('[*] Creating new board: "Whimsical Mermaid Reef"...');
  const boardId = await page.evaluate(async (findStoresFnStr) => {
    // Instantiate findStores
    const findStores = new Function(findStoresFnStr + '; return findStores;')();
    const stores = findStores();
    if (!stores || !stores.useBoardsStore) {
      throw new Error('useBoardsStore not found on page');
    }
    const newId = await stores.useBoardsStore.getState().createBoard('Whimsical Mermaid Reef');
    return newId;
  }, findStoresSerialized);
  
  console.log(`[+] Board created successfully with ID: ${boardId}`);
  
  // Wait for board selection and hydration to complete
  await page.waitForFunction((id, findStoresFnStr) => {
    const findStores = new Function(findStoresFnStr + '; return findStores;')();
    const stores = findStores();
    return stores && stores.useBoardsStore && stores.useBoardsStore.getState().currentBoardId === id;
  }, { timeout: 15000 }, boardId, findStoresSerialized);
  
  await new Promise(r => setTimeout(r, 1500)); // small buffer for render tree sync

  console.log('[*] Commencing drawing on the new board...');
  
  const drawResult = await page.evaluate(async (findStoresFnStr) => {
    try {
      const findStores = new Function(findStoresFnStr + '; return findStores;')();
      const stores = findStores() || {};
      const canUseStores = Boolean(stores.useShapeToolStore && stores.useAppStore);

      if (!canUseStores) {
        throw new Error('Required Zustand stores not found on the page.');
      }

      // Clear the active canvas to make a fresh drawing
      stores.useShapeToolStore.setState({ nodes: {}, order: [] });
      stores.useTextToolStore.setState({ nodes: {}, order: [] });

      // Set Background Color
      stores.useAppStore.getState().setBackgroundColor('#051329');

      // Helper function to interpolate colors
      function interpolateColor(color1, color2, factor) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        
        const rHex = r.toString(16).padStart(2, '0');
        const gHex = g.toString(16).padStart(2, '0');
        const bHex = b.toString(16).padStart(2, '0');
        
        return `#${rHex}${gHex}${bHex}`;
      }

      // Helper function to add/create shape
      let currentZIndex = 100;
      const getZ = () => currentZIndex++;
      
      const shapesToAdd = [];

      function pushShape(shape) {
        shapesToAdd.push({
          ...shape,
          zIndex: getZ(),
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
        });
      }

      // ==========================================
      // 1. UNDERWATER SUN RAYS (Top-Left to Bottom-Right)
      // ==========================================
      const rayAngles = [25, 28, 32, 35, 40];
      const rayWidths = [120, 80, 150, 60, 200];
      const rayOpacities = [0.08, 0.05, 0.07, 0.04, 0.06];
      const rayXs = [-50, 150, 300, 500, 700];

      for (let i = 0; i < rayAngles.length; i++) {
        pushShape({
          id: `ray_${i}_${Date.now()}`,
          type: 'rect',
          x: rayXs[i],
          y: -100,
          width: rayWidths[i],
          height: 1200,
          fill: '#e0f2fe',
          strokeWidth: 0,
          stroke: null,
          opacity: rayOpacities[i],
          rotation: rayAngles[i],
          scaleX: 1,
          scaleY: 1
        });
      }

      // ==========================================
      // 2. CORAL REEF BACKGROUND & GROUND SHADOWS
      // ==========================================
      const groundXs = [100, 300, 500, 700, 900, 1100];
      const groundRadiiX = [180, 220, 200, 250, 190, 240];
      const groundRadiiY = [80, 90, 75, 100, 85, 95];

      for (let i = 0; i < groundXs.length; i++) {
        pushShape({
          id: `reef_bg_${i}_${Date.now()}`,
          type: 'ellipse',
          x: groundXs[i],
          y: 750,
          radiusX: groundRadiiX[i],
          radiusY: groundRadiiY[i],
          fill: '#020617',
          strokeWidth: 0,
          stroke: null,
          opacity: 0.95,
          rotation: 0,
          scaleX: 1,
          scaleY: 1
        });
      }

      const midReefXs = [200, 550, 850];
      const midReefRadiiX = [120, 140, 130];
      const midReefRadiiY = [50, 60, 55];
      for (let i = 0; i < midReefXs.length; i++) {
        pushShape({
          id: `reef_mid_${i}_${Date.now()}`,
          type: 'ellipse',
          x: midReefXs[i],
          y: 735,
          radiusX: midReefRadiiX[i],
          radiusY: midReefRadiiY[i],
          fill: '#1e1b4b',
          strokeWidth: 0,
          stroke: null,
          opacity: 0.85,
          rotation: (i % 2 === 0) ? 5 : -5,
          scaleX: 1,
          scaleY: 1
        });
      }

      // ==========================================
      // 3. FLOURISHING KELP & TALL SEAWEED (Left and Right)
      // ==========================================
      function createKelpChain(startX, startY, count, sizeW, sizeH, angleShift, color) {
        let currentX = startX;
        let currentY = startY;
        let currentRotation = 0;

        for (let j = 0; j < count; j++) {
          currentRotation += angleShift * Math.sin(j * 0.8);
          currentX += Math.sin(currentRotation * Math.PI / 180) * (sizeH - 12);
          currentY -= Math.cos(currentRotation * Math.PI / 180) * (sizeH - 12);

          pushShape({
            id: `kelp_${startX}_${j}_${Date.now()}`,
            type: 'ellipse',
            x: currentX,
            y: currentY,
            radiusX: sizeW,
            radiusY: sizeH,
            fill: color,
            strokeWidth: 0,
            stroke: null,
            opacity: 0.85,
            rotation: currentRotation,
            scaleX: 1,
            scaleY: 1
          });
        }
      }

      createKelpChain(150, 750, 12, 10, 22, 14, '#047857');
      createKelpChain(180, 760, 10, 8, 18, -12, '#059669');
      createKelpChain(950, 770, 11, 11, 24, 15, '#0d9488');
      createKelpChain(990, 760, 9, 8, 16, -16, '#14b8a6');

      // ==========================================
      // 4. COLORFUL CORALS & SEA ANEMONES
      // ==========================================
      const orangeCoralCoords = [
        { x: 280, y: 700, w: 18, h: 60, rot: -15 },
        { x: 295, y: 685, w: 15, h: 75, rot: 5 },
        { x: 312, y: 690, w: 16, h: 55, rot: 25 },
        { x: 290, y: 670, w: 12, h: 40, rot: -35 }
      ];
      orangeCoralCoords.forEach((c, idx) => {
        pushShape({
          id: `orange_coral_${idx}_${Date.now()}`,
          type: 'rect',
          x: c.x,
          y: c.y,
          width: c.w,
          height: c.h,
          fill: '#f97316',
          strokeWidth: 1,
          stroke: '#fdba74',
          opacity: 0.9,
          cornerRadius: 6,
          rotation: c.rot
        });
      });

      pushShape({
        id: `pink_fan_base_${Date.now()}`,
        type: 'ellipse',
        x: 820,
        y: 710,
        radiusX: 55,
        radiusY: 35,
        fill: '#db2777',
        stroke: '#f472b6',
        strokeWidth: 2,
        opacity: 0.9,
        rotation: -15
      });

      const fanAngles = [-45, -30, -15, 0, 15, 30, 45];
      fanAngles.forEach((angle, idx) => {
        const rad = angle * Math.PI / 180;
        pushShape({
          id: `pink_fan_rib_${idx}_${Date.now()}`,
          type: 'triangle',
          x: 820 + 35 * Math.sin(rad),
          y: 710 - 35 * Math.cos(rad),
          width: 14,
          height: 60,
          fill: '#ec4899',
          stroke: '#fbcfe8',
          strokeWidth: 1.5,
          opacity: 0.95,
          rotation: angle - 15
        });
      });

      const spongeCoords = [
        { x: 450, y: 700, w: 22, h: 60, color: '#f59e0b', stroke: '#fbbf24' },
        { x: 472, y: 685, w: 25, h: 75, color: '#d97706', stroke: '#f59e0b' },
        { x: 495, y: 710, w: 20, h: 50, color: '#b45309', stroke: '#d97706' }
      ];
      spongeCoords.forEach((s, idx) => {
        pushShape({
          id: `sponge_${idx}_${Date.now()}`,
          type: 'rect',
          x: s.x,
          y: s.y,
          width: s.w,
          height: s.h,
          fill: s.color,
          stroke: s.stroke,
          strokeWidth: 2,
          cornerRadius: 8,
          rotation: -5
        });
        pushShape({
          id: `sponge_mouth_${idx}_${Date.now()}`,
          type: 'ellipse',
          x: s.x + s.w / 2,
          y: s.y,
          radiusX: s.w / 2,
          radiusY: 4,
          fill: '#451a03',
          strokeWidth: 1,
          stroke: s.stroke,
          rotation: -5
        });
      });

      pushShape({
        id: `brain_coral_${Date.now()}`,
        type: 'ellipse',
        x: 650,
        y: 730,
        radiusX: 45,
        radiusY: 35,
        fill: '#a855f7',
        stroke: '#e9d5ff',
        strokeWidth: 3,
        opacity: 0.95
      });
      for (let i = 1; i <= 3; i++) {
        pushShape({
          id: `brain_coral_texture_${i}_${Date.now()}`,
          type: 'ellipse',
          x: 650,
          y: 730,
          radiusX: 45 - i * 10,
          radiusY: 35 - i * 8,
          fill: null,
          stroke: '#c084fc',
          strokeWidth: 2,
          opacity: 0.7
        });
      }

      // ==========================================
      // 5. THE MERMAID (Flowing S-Curve Pose, Centered & Highly Detailed)
      // ==========================================
      
      // A. Main Body Structure (Head, Neck, Torso)
      // Head
      pushShape({
        id: `mermaid_head_${Date.now()}`,
        type: 'ellipse',
        x: 500,
        y: 235,
        radiusX: 14,
        radiusY: 16,
        fill: '#ffe5d9',
        stroke: '#fcd5c5',
        strokeWidth: 1
      });

      // Eyes
      pushShape({
        id: `mermaid_eye_l_${Date.now()}`,
        type: 'ellipse',
        x: 494,
        y: 232,
        radiusX: 1.5,
        radiusY: 2,
        fill: '#1e293b',
        strokeWidth: 0
      });
      pushShape({
        id: `mermaid_eye_r_${Date.now()}`,
        type: 'ellipse',
        x: 506,
        y: 232,
        radiusX: 1.5,
        radiusY: 2,
        fill: '#1e293b',
        strokeWidth: 0
      });

      // Cheeks (Blush)
      pushShape({
        id: `mermaid_blush_l_${Date.now()}`,
        type: 'ellipse',
        x: 491,
        y: 239,
        radiusX: 3,
        radiusY: 2,
        fill: '#fb7185',
        strokeWidth: 0,
        opacity: 0.6
      });
      pushShape({
        id: `mermaid_blush_r_${Date.now()}`,
        type: 'ellipse',
        x: 509,
        y: 239,
        radiusX: 3,
        radiusY: 2,
        fill: '#fb7185',
        strokeWidth: 0,
        opacity: 0.6
      });

      // Smiling mouth
      pushShape({
        id: `mermaid_smile_${Date.now()}`,
        type: 'ellipse',
        x: 500,
        y: 242,
        radiusX: 2.5,
        radiusY: 1.5,
        fill: '#e11d48',
        strokeWidth: 0
      });

      // Neck
      pushShape({
        id: `mermaid_neck_${Date.now()}`,
        type: 'ellipse',
        x: 500,
        y: 255,
        radiusX: 4,
        radiusY: 10,
        fill: '#ffe5d9',
        strokeWidth: 0
      });

      // Torso
      pushShape({
        id: `mermaid_torso_${Date.now()}`,
        type: 'ellipse',
        x: 500,
        y: 285,
        radiusX: 16,
        radiusY: 25,
        fill: '#ffe5d9',
        stroke: '#fcd5c5',
        strokeWidth: 1
      });

      // Shell Bikini
      pushShape({
        id: `mermaid_shell_l_${Date.now()}`,
        type: 'ellipse',
        x: 493,
        y: 282,
        radiusX: 6.5,
        radiusY: 6.5,
        fill: '#db2777',
        stroke: '#fbcfe8',
        strokeWidth: 1
      });
      pushShape({
        id: `mermaid_shell_r_${Date.now()}`,
        type: 'ellipse',
        x: 507,
        y: 282,
        radiusX: 6.5,
        radiusY: 6.5,
        fill: '#db2777',
        stroke: '#fbcfe8',
        strokeWidth: 1
      });

      // B. Waving Arms
      // Left Arm (Articulated upper & forearm)
      pushShape({
        id: `mermaid_upper_arm_l_${Date.now()}`,
        type: 'ellipse',
        x: 480,
        y: 278,
        radiusX: 4,
        radiusY: 14,
        fill: '#ffe5d9',
        strokeWidth: 0,
        rotation: 45
      });
      pushShape({
        id: `mermaid_forearm_l_${Date.now()}`,
        type: 'ellipse',
        x: 462,
        y: 290,
        radiusX: 3.5,
        radiusY: 12,
        fill: '#ffe5d9',
        strokeWidth: 0,
        rotation: 80
      });

      // Right Arm (Articulated upper & forearm)
      pushShape({
        id: `mermaid_upper_arm_r_${Date.now()}`,
        type: 'ellipse',
        x: 520,
        y: 278,
        radiusX: 4,
        radiusY: 14,
        fill: '#ffe5d9',
        strokeWidth: 0,
        rotation: -45
      });
      pushShape({
        id: `mermaid_forearm_r_${Date.now()}`,
        type: 'ellipse',
        x: 538,
        y: 290,
        radiusX: 3.5,
        radiusY: 12,
        fill: '#ffe5d9',
        strokeWidth: 0,
        rotation: -80
      });

      // C. Beautiful Flowing Hair
      // Back Hair Layer
      pushShape({
        id: `mermaid_hair_bg_${Date.now()}`,
        type: 'ellipse',
        x: 500,
        y: 220,
        radiusX: 25,
        radiusY: 20,
        fill: '#db2777',
        strokeWidth: 0
      });
      // Side flows
      pushShape({
        id: `mermaid_hair_flow_l_${Date.now()}`,
        type: 'ellipse',
        x: 476,
        y: 235,
        radiusX: 16,
        radiusY: 30,
        fill: '#db2777',
        strokeWidth: 0,
        rotation: 15
      });
      pushShape({
        id: `mermaid_hair_flow_r_${Date.now()}`,
        type: 'ellipse',
        x: 524,
        y: 235,
        radiusX: 16,
        radiusY: 30,
        fill: '#db2777',
        strokeWidth: 0,
        rotation: -15
      });
      // Long flowing locks
      pushShape({
        id: `mermaid_hair_lock_l_${Date.now()}`,
        type: 'ellipse',
        x: 465,
        y: 270,
        radiusX: 10,
        radiusY: 45,
        fill: '#ec4899',
        strokeWidth: 0,
        rotation: 10
      });
      pushShape({
        id: `mermaid_hair_lock_r_${Date.now()}`,
        type: 'ellipse',
        x: 535,
        y: 270,
        radiusX: 10,
        radiusY: 45,
        fill: '#ec4899',
        strokeWidth: 0,
        rotation: -10
      });
      // Top Bangs
      pushShape({
        id: `mermaid_bangs_l_${Date.now()}`,
        type: 'ellipse',
        x: 492,
        y: 224,
        radiusX: 8,
        radiusY: 12,
        fill: '#f43f5e',
        strokeWidth: 0,
        rotation: 30
      });
      pushShape({
        id: `mermaid_bangs_r_${Date.now()}`,
        type: 'ellipse',
        x: 508,
        y: 224,
        radiusX: 8,
        radiusY: 12,
        fill: '#f43f5e',
        strokeWidth: 0,
        rotation: -30
      });

      // D. Mathematically-Aligned S-Curve Tail (35 smooth segments)
      const tailSegmentsCount = 35;
      const tailStartX = 500;
      const tailStartY = 308; // starts at bottom of torso
      const tailCurveHeight = 240;

      for (let i = 0; i < tailSegmentsCount; i++) {
        const t = i / (tailSegmentsCount - 1);
        const y = tailStartY + t * tailCurveHeight;
        // S-curve wave offset
        const x = tailStartX + Math.sin(t * Math.PI * 1.5) * 55;
        
        // Calculate tangent angle for rotation
        const dx = 55 * Math.cos(t * Math.PI * 1.5) * (Math.PI * 1.5);
        const dy = tailCurveHeight;
        const rot = Math.atan2(dx, dy) * 180 / Math.PI;
        
        // Taper size from hips (16px radius) to tip (3px radius)
        const rx = 16.5 - t * 13.5;
        const ry = rx * 1.25;
        
        // Interpolate color from deep teal to cyan to shimmering emerald green
        let fill;
        if (t < 0.5) {
          fill = interpolateColor('#0f766e', '#06b6d4', t * 2);
        } else {
          fill = interpolateColor('#06b6d4', '#10b981', (t - 0.5) * 2);
        }
        
        pushShape({
          id: `mermaid_tail_${i}_${Date.now()}`,
          type: 'ellipse',
          x,
          y,
          radiusX: rx,
          radiusY: ry,
          fill,
          stroke: '#e0f2fe',
          strokeWidth: 0.8,
          opacity: 0.95,
          rotation: rot
        });

        // Add shimmering scales along the tail every 3rd segment
        if (i > 3 && i < tailSegmentsCount - 4 && i % 3 === 0) {
          // Left scale
          pushShape({
            id: `mermaid_scale_l_${i}_${Date.now()}`,
            type: 'ellipse',
            x: x - rx * 0.4,
            y: y,
            radiusX: rx * 0.35,
            radiusY: rx * 0.35,
            fill: '#ec4899',
            stroke: '#ffffff',
            strokeWidth: 0.4,
            opacity: 0.85,
            rotation: rot
          });
          // Right scale
          pushShape({
            id: `mermaid_scale_r_${i}_${Date.now()}`,
            type: 'ellipse',
            x: x + rx * 0.4,
            y: y,
            radiusX: rx * 0.35,
            radiusY: rx * 0.35,
            fill: '#facc15',
            stroke: '#ffffff',
            strokeWidth: 0.4,
            opacity: 0.85,
            rotation: rot
          });
        }
      }

      // E. Gorgeous Layered Fin at the Tip of the Tail
      const finX = tailStartX + Math.sin(1.5 * Math.PI) * 55; // 445
      const finY = tailStartY + tailCurveHeight; // 548

      // Left Fin Layers (Translucent Fan Shapes)
      pushShape({
        id: `mermaid_fin_l_1_${Date.now()}`,
        type: 'triangle',
        x: finX,
        y: finY,
        width: 65,
        height: 110,
        fill: '#ec4899',
        stroke: '#fbcfe8',
        strokeWidth: 1.2,
        opacity: 0.7,
        rotation: 140
      });
      pushShape({
        id: `mermaid_fin_l_2_${Date.now()}`,
        type: 'triangle',
        x: finX,
        y: finY,
        width: 45,
        height: 90,
        fill: '#8b5cf6',
        stroke: '#e9d5ff',
        strokeWidth: 0.8,
        opacity: 0.75,
        rotation: 155
      });
      pushShape({
        id: `mermaid_fin_l_3_${Date.now()}`,
        type: 'triangle',
        x: finX,
        y: finY,
        width: 25,
        height: 70,
        fill: '#facc15',
        strokeWidth: 0,
        opacity: 0.8,
        rotation: 170
      });

      // Right Fin Layers (Translucent Fan Shapes)
      pushShape({
        id: `mermaid_fin_r_1_${Date.now()}`,
        type: 'triangle',
        x: finX,
        y: finY,
        width: 65,
        height: 110,
        fill: '#ec4899',
        stroke: '#fbcfe8',
        strokeWidth: 1.2,
        opacity: 0.7,
        rotation: 40
      });
      pushShape({
        id: `mermaid_fin_r_2_${Date.now()}`,
        type: 'triangle',
        x: finX,
        y: finY,
        width: 45,
        height: 90,
        fill: '#8b5cf6',
        stroke: '#e9d5ff',
        strokeWidth: 0.8,
        opacity: 0.75,
        rotation: 25
      });
      pushShape({
        id: `mermaid_fin_r_3_${Date.now()}`,
        type: 'triangle',
        x: finX,
        y: finY,
        width: 25,
        height: 70,
        fill: '#facc15',
        strokeWidth: 0,
        opacity: 0.8,
        rotation: 10
      });

      // ==========================================
      // 6. SEA BUBBLES TRAIL
      // ==========================================
      const bubbleCoords = [
        { x: 590, y: 240, rx: 3.5, ry: 3.5, op: 0.85 },
        { x: 610, y: 215, rx: 5, ry: 5, op: 0.8 },
        { x: 632, y: 190, rx: 7, ry: 7, op: 0.75 },
        { x: 645, y: 155, rx: 4.5, ry: 4.5, op: 0.7 },
        { x: 670, y: 120, rx: 9, ry: 9, op: 0.65 },
        { x: 695, y: 80, rx: 6, ry: 6, op: 0.6 },
        { x: 720, y: 40, rx: 11, ry: 11, op: 0.5 },
        { x: 300, y: 400, rx: 8, ry: 8, op: 0.5 },
        { x: 320, y: 350, rx: 4, ry: 4, op: 0.6 },
        { x: 280, y: 200, rx: 12, ry: 12, op: 0.4 },
        { x: 850, y: 450, rx: 6, ry: 6, op: 0.55 },
        { x: 880, y: 380, rx: 10, ry: 10, op: 0.45 },
        { x: 910, y: 220, rx: 5, ry: 5, op: 0.65 }
      ];

      bubbleCoords.forEach((b, idx) => {
        pushShape({
          id: `bubble_${idx}_${Date.now()}`,
          type: 'ellipse',
          x: b.x,
          y: b.y,
          radiusX: b.rx,
          radiusY: b.ry,
          fill: null,
          stroke: '#e0f2fe',
          strokeWidth: 1.5,
          opacity: b.op,
          rotation: 0
        });
      });

      // ==========================================
      // 7. NEON YELLOW/ORANGE SCHOOL OF FISH
      // ==========================================
      const schoolOfFish = [
        { x: 340, y: 320, rx: 11, ry: 5.5, rot: -10, color: '#facc15' },
        { x: 375, y: 335, rx: 9, ry: 4.5, rot: 5,   color: '#facc15' },
        { x: 355, y: 295, rx: 9, ry: 4.5, rot: -20, color: '#f59e0b' },
        { x: 315, y: 350, rx: 7, ry: 3.5, rot: 15,  color: '#fb923c' },
        { x: 810, y: 260, rx: 12, ry: 6,   rot: -5,  color: '#facc15' },
        { x: 845, y: 275, rx: 10, ry: 5,   rot: 10,  color: '#facc15' },
        { x: 825, y: 235, rx: 9, ry: 4.5,  rot: -15, color: '#f59e0b' }
      ];

      schoolOfFish.forEach((fish, idx) => {
        pushShape({
          id: `fish_body_${idx}_${Date.now()}`,
          type: 'ellipse',
          x: fish.x,
          y: fish.y,
          radiusX: fish.rx,
          radiusY: fish.ry,
          fill: fish.color,
          strokeWidth: 0,
          rotation: fish.rot
        });
        const rad = fish.rot * Math.PI / 180;
        const tailOffset = fish.rx + 2;
        pushShape({
          id: `fish_tail_${idx}_${Date.now()}`,
          type: 'triangle',
          x: fish.x - tailOffset * Math.cos(rad),
          y: fish.y - tailOffset * Math.sin(rad),
          width: fish.ry * 1.5,
          height: fish.ry * 2.2,
          fill: fish.color,
          strokeWidth: 0,
          rotation: fish.rot + 90
        });
      });

      // ==========================================
      // 8. GLOWING BACKGROUND JELLYFISH
      // ==========================================
      pushShape({
        id: `jelly_dome_1_${Date.now()}`,
        type: 'ellipse',
        x: 740,
        y: 160,
        radiusX: 20,
        radiusY: 13,
        fill: '#f472b6',
        stroke: '#fbcfe8',
        strokeWidth: 1.5,
        opacity: 0.55
      });
      for (let t = 0; t < 3; t++) {
        pushShape({
          id: `jelly_tentacle_1_${t}_${Date.now()}`,
          type: 'rect',
          x: 728 + t * 8,
          y: 173,
          width: 1.5,
          height: 35,
          fill: '#fbcfe8',
          strokeWidth: 0,
          opacity: 0.4,
          rotation: (t - 1) * 8
        });
      }

      pushShape({
        id: `jelly_dome_2_${Date.now()}`,
        type: 'ellipse',
        x: 220,
        y: 240,
        radiusX: 25,
        radiusY: 16,
        fill: '#c084fc',
        stroke: '#e9d5ff',
        strokeWidth: 1.5,
        opacity: 0.5
      });
      for (let t = 0; t < 4; t++) {
        pushShape({
          id: `jelly_tentacle_2_${t}_${Date.now()}`,
          type: 'rect',
          x: 208 + t * 7,
          y: 256,
          width: 1.5,
          height: 45,
          fill: '#e9d5ff',
          strokeWidth: 0,
          opacity: 0.35,
          rotation: (t - 1.5) * 6
        });
      }

      // ==========================================
      // 9. WHIMSICAL TITLE TEXT
      // ==========================================
      const titleNode = {
        id: `title_${Date.now()}`,
        type: 'text',
        text: 'The Coral Lagoon',
        x: 450,
        y: 80,
        width: 320,
        height: 50,
        rotation: 0,
        fxFontSize: 36,
        fxFontFamily: 'Outfit',
        fxFontStyle: 'italic',
        fxTextDecoration: '',
        fxFill: '#ffffff',
        fxLineHeight: 1.2,
        fxAlign: 'center',
        fxStroke: '#22d3ee',
        fxStrokeWidth: 1.5,
        zIndex: getZ(),
        richTextHtml: 'The Coral Lagoon',
        richTextRuns: [
          {
            text: 'The Coral Lagoon',
            fxFontSize: 36,
            fxFontFamily: 'Outfit',
            fxFontStyle: 'italic',
            fxTextDecoration: '',
            fxFill: '#ffffff',
            fxLineHeight: 1.2,
            fxAlign: 'center',
            fxStroke: '#22d3ee',
            fxStrokeWidth: 1.5
          }
        ],
        sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
      };

      // Direct inject to Zustand
      shapesToAdd.forEach(shape => {
        stores.useShapeToolStore.getState().addNode(shape);
      });
      stores.useTextToolStore.getState().upsertTextNode(titleNode);

      // Redraw stage
      if (window.stage && window.contentLayer) {
        window.stage.batchDraw();
      }

      // Sync state hint
      window.dispatchEvent(new CustomEvent('boarderless:syncHintVisibility'));

      return { success: true, count: shapesToAdd.length + 1 };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, findStoresSerialized);

  if (drawResult.success) {
    console.log(`[+] Success! Drawn successfully with ${drawResult.count} nodes.`);
  } else {
    console.error('[-] Error drawing scene:', drawResult.error);
  }

  await browser.disconnect();
}

main().catch(console.error);

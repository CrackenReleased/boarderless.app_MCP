// process_graduation_photo.js
import { spawn } from 'node:child_process';
import { copyFile, rm } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sourceImagePath = 'C:\\Users\\Beast\\Downloads\\FBA 2026 Graduation Slide Presentation-20260526T215059Z-3-001\\FBA 2026 Graduation Slide Presentation\\Ben Hardt\\19.jpg';
const destImagePath = 'E:\\boarderless\\public\\temp_input.jpg';
const outputPath = 'C:\\Users\\Beast\\Downloads\\FBA 2026 Graduation Slide Presentation-20260526T215059Z-3-001\\FBA 2026 Graduation Slide Presentation\\Ben Hardt\\19_boarderless.png';

async function main() {
  try {
    console.log('Copying image to public folder...');
    await copyFile(sourceImagePath, destImagePath);

    console.log('Starting dev server on port 5174...');
    const devServer = spawn('npx', ['vite', '--port', '5174'], {
      cwd: 'E:\\boarderless',
      shell: true,
      stdio: 'ignore'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      defaultViewport: { width: 1920, height: 1080 }
    });

    try {
      const page = await browser.newPage();
      
      // Console diagnostic logging
      page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
      page.on('pageerror', err => console.error('BROWSER EXCEPTION:', err));

      console.log('Navigating to canvas...');
      await page.goto('http://localhost:5174/canvas');

      // Authenticate as pro
      await page.evaluate(() => {
        const authPayload = btoa(JSON.stringify({
          name: 'MCP Verifier',
          email: 'mcp-verifier@boarderless.local',
          email_verified: true,
          sub: 'mcp-verifier',
          tier: 'pro',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })).replace(/=/g, '');
        localStorage.setItem('boarderless_beta_unlocked', 'true');
        localStorage.setItem('boarderless_auth_token', `test.${authPayload}.signature`);
        localStorage.setItem('boarderless_dev_tier', 'pro');
      });

      // Reload page to apply authentication
      await page.goto('http://localhost:5174/canvas', { waitUntil: 'networkidle2' });

      // Wait for the app to be fully loaded and stores to be available
      await page.waitForFunction(() => Boolean(window.useGalleryStore && window.useTextToolStore && window.useShapeToolStore), { timeout: 15000 });

      console.log('Preloading custom fonts via CSS Font Loading API...');
      await page.evaluate(async () => {
        try {
          await Promise.all([
            document.fonts.load('bold 12px "Syne"'),
            document.fonts.load('800 12px "Outfit"'),
            document.fonts.load('12px "Alex Brush"')
          ]);
          console.log('All custom fonts loaded successfully.');
        } catch (e) {
          console.error('Failed preloading fonts:', e);
        }
      });

      console.log('Clearing canvas...');
      await page.evaluate(() => {
        window.useGalleryStore.getState().hydrateNodes([]);
        window.useTextToolStore.getState().hydrateTextNodes([]);
        window.useShapeToolStore.getState().hydrateNodes([]);
        window.useAppStore.getState().setBackgroundColor('#000000');
      });

      console.log('Processing image and setting up layout...');
      const layoutResult = await page.evaluate(async () => {
        // 1. Fetch the image from the local public server
        const response = await fetch('/temp_input.jpg');
        const blob = await response.blob();

        // 2. Process image blob to create a GalleryAsset
        const asset = await window.processImageBlob(blob);
        window.useGalleryStore.getState().addAsset(asset);

        const imgW = asset.previewWidth;
        const imgH = asset.previewHeight;

        // Helper to ensure text nodes are fully initialized with default values
        const addTextNodeHelper = (node) => {
          const defaultTextNode = {
            fxTextDecoration: '',
            fxStroke: '#000000',
            fxStrokeWidth: 0,
            fxLineHeight: 1.2,
            richTextRuns: [],
          };
          window.useTextToolStore.getState().upsertTextNode({
            ...defaultTextNode,
            ...node
          });
        };

        // Banner proportions
        const compW = imgW + 280; 
        const compH = imgH + 520; 

        // 3. Background Base (Rich dark navy-blue/black tone)
        const bgNode = {
          id: `bg_${Date.now()}`,
          type: 'rect',
          x: 0,
          y: 0,
          width: compW,
          height: compH,
          fill: '#060814',
          stroke: '#060814',
          strokeWidth: 0,
          opacity: 1,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 0,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(bgNode);

        // 3.05 Dot Grid / Stadium Scoreboard Halftone Pattern in the background
        const rows = 18;
        const cols = 20;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const xVal = (compW / (cols - 1)) * c;
            const yVal = (compH / (rows - 1)) * r;
            const isRed = (r + c) % 3 === 0;
            const isBlue = (r + c) % 3 === 1;
            const dot = {
              id: `bg_dot_${r}_${c}_${Date.now()}`,
              type: 'ellipse',
              x: xVal,
              y: yVal,
              radiusX: 2.2,
              radiusY: 2.2,
              fill: isRed ? '#dc2626' : (isBlue ? '#2563eb' : '#ffffff'),
              fillAlpha: 0.12,
              strokeWidth: 0,
              zIndex: 0.05,
              sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null }
            };
            window.useShapeToolStore.getState().addNode(dot);
          }
        }

        // 3.1 Huge Vertical Watermark Text (Left side)
        const leftWatermark = {
          id: `txt_wm_left_${Date.now()}`,
          type: 'text',
          text: 'F B A  P A T R I O T S',
          x: 80,
          y: compH - 60,
          width: compH - 120,
          height: 220,
          rotation: -90,
          fxFontSize: 140,
          fxFontFamily: 'Syne',
          fxFontStyle: 'bold',
          fxFill: 'rgba(220, 38, 38, 0.16)', // Crimson red translucent
          fxLineHeight: 1,
          fxAlign: 'center',
          fxStroke: 'rgba(255,255,255,0.03)',
          fxStrokeWidth: 3,
          richTextRuns: [],
          zIndex: 0.2,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(leftWatermark);

        // 3.2 Huge Vertical Watermark Text (Right side)
        const rightWatermark = {
          id: `txt_wm_right_${Date.now()}`,
          type: 'text',
          text: 'VARSITY ATHLETICS',
          x: compW - 120,
          y: compH - 60,
          width: compH - 120,
          height: 220,
          rotation: -90,
          fxFontSize: 110,
          fxFontFamily: 'Syne',
          fxFontStyle: 'bold',
          fxFill: 'rgba(37, 99, 235, 0.18)', // Patriots Blue translucent
          fxLineHeight: 1,
          fxAlign: 'center',
          fxStroke: 'rgba(255,255,255,0.03)',
          fxStrokeWidth: 3,
          richTextRuns: [],
          zIndex: 0.3,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(rightWatermark);

        // 3.3 Diagonal background racing stripes (Dynamic high-voltage energy)
        const stripes = [
          { x: -50, w: 40, fill: '#dc2626', alpha: 0.18 },
          { x: 10, w: 10, fill: '#ffffff', alpha: 0.12 },
          { x: 50, w: 80, fill: '#2563eb', alpha: 0.15 },
          { x: compW * 0.3, w: 15, fill: '#dc2626', alpha: 0.08 },
          { x: compW * 0.7, w: 25, fill: '#2563eb', alpha: 0.08 },
          { x: compW - 120, w: 60, fill: '#dc2626', alpha: 0.15 },
          { x: compW - 50, w: 15, fill: '#ffffff', alpha: 0.12 },
          { x: compW + 20, w: 30, fill: '#2563eb', alpha: 0.18 },
        ];

        stripes.forEach((s, idx) => {
          const stripeNode = {
            id: `stripe_${idx}_${Date.now()}`,
            type: 'rect',
            x: s.x,
            y: -600,
            width: s.w,
            height: compH + 1200,
            fill: s.fill,
            fillAlpha: s.alpha,
            strokeWidth: 0,
            opacity: 1,
            rotation: -30,
            scaleX: 1,
            scaleY: 1,
            zIndex: 0.4 + idx * 0.02,
            sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
          };
          window.useShapeToolStore.getState().addNode(stripeNode);
        });

        // 3.4 Intense Glowing background flares / gradient lights
        const glowPoints = [
          { x: compW * 0.25, y: compH * 0.35, r: 350, fill: '#dc2626', alpha: 0.42 }, // High-energy Crimson
          { x: compW * 0.75, y: compH * 0.55, r: 380, fill: '#2563eb', alpha: 0.45 }, // High-energy Royal Blue
          { x: compW * 0.5, y: compH * 0.45, r: 200, fill: '#ffffff', alpha: 0.2 },   // White hot core
        ];

        glowPoints.forEach((gp, idx) => {
          const glowNode = {
            id: `glow_${idx}_${Date.now()}`,
            type: 'ellipse',
            x: gp.x,
            y: gp.y,
            radiusX: gp.r,
            radiusY: gp.r,
            fill: gp.fill,
            fillAlpha: gp.alpha,
            fillFuzziness: 150, // Massive glow blur
            strokeWidth: 0,
            opacity: 1,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 0.9 + idx * 0.05,
            sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
          };
          window.useShapeToolStore.getState().addNode(glowNode);
        });

        // 3.5 Giant Watermark Image of Ben in the background (Aggressive tint/contrast)
        const watermarkImg = {
          id: `img_wm_${Date.now()}`,
          assetId: asset.id,
          x: compW * 0.5 - (imgW * 1.3) / 2,
          y: 120,
          width: imgW * 1.3,
          height: imgH * 1.3,
          scaleX: 1,
          scaleY: 1,
          rotation: 8,
          opacity: 0.25,
          zIndex: 1.5,
          filterAttrs: {
            brightness: 0.0,
            contrast: 0.6,
            saturation: -1.0, // Monochrome
            hue: 0,
            blur: 2
          },
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useGalleryStore.getState().addNode(watermarkImg);

        // 3.6 Hollow Background Frame offsets behind the subject card
        const frameW = imgW + 40;
        const frameH = imgH + 40;
        const frameX = (compW - frameW) / 2;
        const frameY = 220;

        const blueFrame = {
          id: `frame_blue_${Date.now()}`,
          type: 'rect',
          x: frameX - 25,
          y: frameY + 25,
          width: frameW,
          height: frameH,
          fill: '',
          stroke: '#1e40af',
          strokeWidth: 15,
          opacity: 0.9,
          rotation: -5,
          scaleX: 1,
          scaleY: 1,
          zIndex: 1.8,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(blueFrame);

        const redFrame = {
          id: `frame_red_${Date.now()}`,
          type: 'rect',
          x: frameX + 25,
          y: frameY - 25,
          width: frameW,
          height: frameH,
          fill: '',
          stroke: '#b91c1c',
          strokeWidth: 15,
          opacity: 0.9,
          rotation: 5,
          scaleX: 1,
          scaleY: 1,
          zIndex: 1.9,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(redFrame);

        // 4. Main Foreground Image (Slanted athletic crop + high-contrast sports treatment)
        const imageNode = {
          id: `img_${Date.now()}`,
          assetId: asset.id,
          x: frameX,
          y: frameY,
          width: frameW,
          height: frameH,
          scaleX: 1,
          scaleY: 1,
          rotation: -2,
          zIndex: 2,
          clipPathPoints: [
            { fx: 0.12, fy: 0.0 }, // Slanted Parallelogram
            { fx: 1.0, fy: 0.0 },
            { fx: 0.88, fy: 1.0 },
            { fx: 0.0, fy: 1.0 }
          ],
          filterAttrs: {
            brightness: 0.08,
            contrast: 0.42, // Higher contrast
            saturation: 0.48, // Vibrant saturation boost
            hue: 0,
            blur: 0
          },
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useGalleryStore.getState().addNode(imageNode);

        // 4.5 Geometric "Card Overlay Shards" overlapping the borders of the main subject
        const shards = [
          // White triangle shard top-left
          {
            type: 'triangle',
            x: frameX + 20,
            y: frameY - 20,
            width: 80,
            height: 80,
            fill: '#ffffff',
            stroke: '#ffffff',
            strokeWidth: 2,
            rotation: 15,
            zIndex: 2.1
          },
          // Red triangle shard bottom-left
          {
            type: 'triangle',
            x: frameX - 30,
            y: frameY + frameH - 120,
            width: 100,
            height: 100,
            fill: '#dc2626',
            stroke: '#ffffff',
            strokeWidth: 2,
            rotation: -45,
            zIndex: 2.2
          },
          // Blue triangle shard top-right
          {
            type: 'triangle',
            x: frameX + frameW - 80,
            y: frameY - 30,
            width: 90,
            height: 90,
            fill: '#2563eb',
            stroke: '#ffffff',
            strokeWidth: 2,
            rotation: 85,
            zIndex: 2.3
          }
        ];

        shards.forEach((sh, idx) => {
          const shardNode = {
            id: `shard_${idx}_${Date.now()}`,
            type: 'triangle',
            x: sh.x,
            y: sh.y,
            width: sh.width,
            height: sh.height,
            fill: sh.fill,
            fillAlpha: 1,
            stroke: sh.stroke,
            strokeWidth: sh.strokeWidth,
            opacity: 1,
            rotation: sh.rotation,
            scaleX: 1,
            scaleY: 1,
            zIndex: sh.zIndex,
            sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
          };
          window.useShapeToolStore.getState().addNode(shardNode);
        });

        // 5. Header Ribbon Lockup (Skewed Athletic Badge)
        const headerBadgeW = 860;
        const headerBadgeX = (compW - headerBadgeW) / 2;
        const headerBadge = {
          id: `header_badge_${Date.now()}`,
          type: 'rect',
          x: headerBadgeX,
          y: 50,
          width: headerBadgeW,
          height: 90,
          fill: '#1e40af', // Deep blue banner
          stroke: '#ffffff',
          strokeWidth: 4,
          opacity: 1,
          rotation: -1,
          scaleX: 1,
          scaleY: 1,
          zIndex: 3.5,
          clipPathPoints: [
            { fx: 0.04, fy: 0.0 }, // Slanted badge style
            { fx: 0.96, fy: 0.0 },
            { fx: 1.0, fy: 1.0 },
            { fx: 0.0, fy: 1.0 }
          ],
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(headerBadge);

        const titleFontSize = 34; // Reduced to fit perfectly
        const titleNode = {
          id: `txt_title_${Date.now()}`,
          type: 'text',
          text: 'FREDERICK BAPTIST ACADEMY',
          x: headerBadgeX,
          y: 78,
          width: headerBadgeW,
          height: 80,
          rotation: -1,
          fxFontSize: titleFontSize,
          fxFontFamily: 'Syne',
          fxFontStyle: 'bold',
          fxFill: '#ffffff',
          fxLineHeight: 1.2,
          fxAlign: 'center',
          fxStroke: '#dc2626', // Outlined red
          fxStrokeWidth: 4,
          richTextRuns: [],
          zIndex: 4,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(titleNode);

        // 5.1 Horizontal patriotic divider line under the title
        const dividerRed = {
          id: `div_r_${Date.now()}`,
          type: 'rect',
          x: 100,
          y: 165,
          width: compW - 200,
          height: 5,
          fill: '#dc2626',
          strokeWidth: 0,
          opacity: 0.95,
          zIndex: 4.1,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(dividerRed);

        const dividerWhite = {
          id: `div_w_${Date.now()}`,
          type: 'rect',
          x: 100,
          y: 170,
          width: compW - 200,
          height: 3,
          fill: '#ffffff',
          strokeWidth: 0,
          opacity: 0.95,
          zIndex: 4.2,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(dividerWhite);

        const dividerBlue = {
          id: `div_b_${Date.now()}`,
          type: 'rect',
          x: 100,
          y: 173,
          width: compW - 200,
          height: 5,
          fill: '#2563eb',
          strokeWidth: 0,
          opacity: 0.95,
          zIndex: 4.3,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(dividerBlue);

        // 6. Bottom Lockup - Red Banner for "VARSITY BASKETBALL" (Double dynamic drop shadow)
        const bannerW = 540;
        const bannerX = (compW - bannerW) / 2;
        const bannerY = 220 + frameH + 60;

        const subBannerShadow = {
          id: `banner_sub_shadow_${Date.now()}`,
          type: 'rect',
          x: bannerX + 8,
          y: bannerY + 8,
          width: bannerW,
          height: 55,
          fill: '#0c1b40', // Blue shadow
          opacity: 0.8,
          rotation: -3,
          scaleX: 1,
          scaleY: 1,
          zIndex: 4.6,
          clipPathPoints: [
            { fx: 0.05, fy: 0.0 },
            { fx: 1.0, fy: 0.0 },
            { fx: 0.95, fy: 1.0 },
            { fx: 0.0, fy: 1.0 }
          ],
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(subBannerShadow);

        const subBanner = {
          id: `banner_sub_${Date.now()}`,
          type: 'rect',
          x: bannerX,
          y: bannerY,
          width: bannerW,
          height: 55,
          fill: '#dc2626', // High-intensity Red banner
          stroke: '#ffffff',
          strokeWidth: 3,
          opacity: 1,
          rotation: -3,
          scaleX: 1,
          scaleY: 1,
          zIndex: 4.8,
          clipPathPoints: [
            { fx: 0.05, fy: 0.0 },
            { fx: 1.0, fy: 0.0 },
            { fx: 0.95, fy: 1.0 },
            { fx: 0.0, fy: 1.0 }
          ],
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(subBanner);

        const subFontSize = 24; // Fits perfectly within bannerW (540px)
        const subNode = {
          id: `txt_sub_${Date.now()}`,
          type: 'text',
          text: 'VARSITY BASKETBALL',
          x: bannerX,
          y: bannerY + 16,
          width: bannerW,
          height: 50,
          rotation: -3,
          fxFontSize: subFontSize,
          fxFontFamily: 'Outfit',
          fxFontStyle: 'bold',
          fxFill: '#ffffff',
          fxLineHeight: 1.1,
          fxAlign: 'center',
          richTextRuns: [],
          zIndex: 5,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(subNode);

        // 7. Giant 3D Outlined Name: BENJAMIN HARDT
        const nameFontSize = 74; // Sized down to prevent wrapping / clipping
        const nameY = 220 + frameH + 130;

        // Shadow Layer 2 (Deep Red Offset shadow)
        const nameShadowNode2 = {
          id: `txt_name_shadow2_${Date.now()}`,
          type: 'text',
          text: 'BENJAMIN HARDT',
          x: 8,
          y: nameY + 8,
          width: compW,
          height: 110,
          rotation: -3,
          fxFontSize: nameFontSize,
          fxFontFamily: 'Syne',
          fxFontStyle: 'bold',
          fxFill: '#7f1d1d', // Dark red shadow
          fxLineHeight: 1.2,
          fxAlign: 'center',
          fxStroke: '#7f1d1d',
          fxStrokeWidth: 10,
          richTextRuns: [],
          zIndex: 5.7,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(nameShadowNode2);

        // Shadow Layer 1 (Bright Red Offset shadow)
        const nameShadowNode = {
          id: `txt_name_shadow_${Date.now()}`,
          type: 'text',
          text: 'BENJAMIN HARDT',
          x: 4,
          y: nameY + 4,
          width: compW,
          height: 110,
          rotation: -3,
          fxFontSize: nameFontSize,
          fxFontFamily: 'Syne',
          fxFontStyle: 'bold',
          fxFill: '#dc2626', // Red shadow
          fxLineHeight: 1.2,
          fxAlign: 'center',
          fxStroke: '#dc2626',
          fxStrokeWidth: 10,
          richTextRuns: [],
          zIndex: 5.8,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(nameShadowNode);

        // Foreground Layer (Outlined Blue)
        const nameNode = {
          id: `txt_name_${Date.now()}`,
          type: 'text',
          text: 'BENJAMIN HARDT',
          x: 0,
          y: nameY,
          width: compW,
          height: 110,
          rotation: -3,
          fxFontSize: nameFontSize,
          fxFontFamily: 'Syne',
          fxFontStyle: 'bold',
          fxFill: '#ffffff',
          fxLineHeight: 1.2,
          fxAlign: 'center',
          fxStroke: '#1e40af', // Outlined Blue
          fxStrokeWidth: 10,
          richTextRuns: [],
          zIndex: 6,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(nameNode);

        // 8. Overlaid Script Text: "Class of 2026" using 'Alex Brush' with glowing backing
        const classShadowNode = {
          id: `txt_class_shadow_${Date.now()}`,
          type: 'text',
          text: 'Class of 2026',
          x: 2,
          y: 132,
          width: compW,
          height: 280,
          rotation: -2,
          fxFontSize: 150,
          fxFontFamily: 'Alex Brush',
          fxFontStyle: 'normal',
          fxFill: '#dc2626', // Red glow back
          fxLineHeight: 1.2,
          fxAlign: 'center',
          fxStroke: '#dc2626',
          fxStrokeWidth: 10,
          richTextRuns: [],
          zIndex: 7.9,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(classShadowNode);

        const classNode = {
          id: `txt_class_${Date.now()}`,
          type: 'text',
          text: 'Class of 2026',
          x: 0,
          y: 130,
          width: compW,
          height: 280,
          rotation: -2,
          fxFontSize: 150,
          fxFontFamily: 'Alex Brush',
          fxFontStyle: 'normal',
          fxFill: '#ffffff',
          fxLineHeight: 1.2,
          fxAlign: 'center',
          fxStroke: '#060814',
          fxStrokeWidth: 6,
          richTextRuns: [],
          zIndex: 8,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        addTextNodeHelper(classNode);

        // 9. Thick energetic outer border framing the entire graphic (Card Border)
        const outerBorder = {
          id: `outer_border_${Date.now()}`,
          type: 'rect',
          x: 15,
          y: 15,
          width: compW - 30,
          height: compH - 30,
          fill: '',
          stroke: '#ffffff',
          strokeWidth: 6,
          opacity: 0.9,
          zIndex: 9.5,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(outerBorder);

        const outerBorderRed = {
          id: `outer_border_red_${Date.now()}`,
          type: 'rect',
          x: 25,
          y: 25,
          width: compW - 50,
          height: compH - 50,
          fill: '',
          stroke: '#dc2626',
          strokeWidth: 4,
          opacity: 0.8,
          zIndex: 9.6,
          sync: { version: 1, updatedAt: new Date().toISOString(), deletedAt: null, clientMutationId: null },
        };
        window.useShapeToolStore.getState().addNode(outerBorderRed);

        // Redraw stage
        if (window.stage && window.contentLayer) {
          window.contentLayer.draw();
        }

        return { success: true, width: compW, height: compH };
      });

      console.log('Layout built successfully:', layoutResult);

      // Wait a moment for rendering and fonts to resolve
      console.log('Waiting for fonts to load...');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await new Promise(r => setTimeout(r, 1200));

      console.log('Rendering high-fidelity output canvas...');
      const base64Data = await page.evaluate(async () => {
        const stage = window.stage;
        const layer = window.contentLayer;
        
        // Temporarily clear selection for clean export
        const shapeSelected = window.useShapeToolStore.getState().selectedId;
        const textSelected = window.useTextToolStore.getState().selectedTextId;
        const imageSelected = window.useGalleryStore.getState().selectedId;
        
        window.useShapeToolStore.getState().selectNode(null);
        window.useTextToolStore.getState().selectTextNode(null);
        window.useGalleryStore.getState().selectNode(null);
        window.useSelectionStore.getState().clearReactOnly();
        
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        
        const bgNode = window.useShapeToolStore.getState().order.map(id => window.useShapeToolStore.getState().nodes[id]).find(n => n.id.startsWith('bg_'));
        const width = bgNode.width;
        const height = bgNode.height;
        
        const originalScale = { x: stage.scaleX(), y: stage.scaleY() };
        const originalPosition = { ...stage.position() };
        
        stage.scale({ x: 1, y: 1 });
        stage.position({ x: 0, y: 0 });
        layer.draw();
        
        const canvas = layer.toCanvas({
          x: 0,
          y: 0,
          width: width,
          height: height,
          pixelRatio: 2, // 2x resolution for high fidelity
        });
        
        // Restore state
        stage.scale(originalScale);
        stage.position(originalPosition);
        window.useShapeToolStore.getState().selectNode(shapeSelected);
        window.useTextToolStore.getState().selectTextNode(textSelected);
        window.useGalleryStore.getState().selectNode(imageSelected);
        layer.batchDraw();
        
        return canvas.toDataURL('image/png');
      });

      const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
      await fs.writeFile(outputPath, buffer);
      console.log(`Successfully saved output image to: ${outputPath}`);

    } finally {
      await browser.close();
      devServer.kill('SIGKILL');
    }
  } catch (error) {
    console.error('Fatal execution error:', error);
  } finally {
    await rm(destImagePath, { force: true });
    console.log('Cleanup completed.');
  }
}

main();

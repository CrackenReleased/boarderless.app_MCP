# Boarderless MCP — Static Ad Spec

Campaign: "Don't just chat. Build on the canvas."
Product: Boarderless MCP Server — connects AI agents (Claude, Cursor, Windsurf) to the live Boarderless canvas.

---

## Brand system (from live canvas mock)

| Token | Value | Use |
|---|---|---|
| Background | `#0D0B1E` | ad background (deep navy) |
| Panel | `#161230` | cards, badges |
| Purple accent | `#A78BFA` | eyebrow text, outlines, CTA fill |
| Purple deep | `#2A2150` | large background circle |
| Cyan accent | `#22D3EE` | secondary circle, highlights |
| Text primary | `#F4F2FF` | headline |
| Text secondary | `#B9B3D9` | body copy |
| Font | Poppins (fallback: Segoe UI, sans-serif) | all text |
| Radius | 24px buttons / 32px cards | rounded, soft |

Visual motif: overlapping dark-purple + cyan circles behind a purple-outlined rounded square containing the "LIVE" badge. Keep ≥60% of the canvas dark and calm — the headline carries the ad.

---

## Copy blocks

**Eyebrow:** MODEL CONTEXT PROTOCOL · LIVE CANVAS

**Headline (primary):** Don't just chat. Build on the canvas.

**Body (long, landscape sizes):**
Connect your coding agent to a real spatial workspace. Inspect, create, move, group, reorder, undo, and export — no pixel scraping, no DOM guessing. A clean, typed spatial ledger your agent can actually read.

**Body (short, square):**
Connect your coding agent to a real spatial workspace. Inspect, create, move, group, undo, export.

**Body (micro, banners):**
MCP for Claude, Cursor & Windsurf.

**Badge:** LIVE — typed spatial ledger

**CTA:** CONNECT YOUR AGENT
**CTA (small sizes):** CONNECT →

**URL lockup:** BOARDERLESS.app

---

## Layouts per placement

### 1. `ad_1200x675_landscape.html` — Product Hunt / dev communities / X card
- Left 60%: eyebrow → headline (72px) → body (long) → CTA pill → URL.
- Right 40%: circle motif + LIVE badge card.
- Extra line under body: "No pixel scraping. No DOM guessing."

### 2. `ad_1080x1080_square.html` — Instagram / square display
- Vertical stack, centered-left: eyebrow → headline (88px) → body (short) → CTA → URL.
- Motif anchored bottom-right, partially bleeding off-canvas.

### 3. `ad_300x250_mrec.html` — display banner (medium rectangle)
- Wordmark top-left. Headline "Build on the canvas." (34px). Micro body. CTA pill bottom.

### 4. `ad_728x90_leaderboard.html` — display banner (leaderboard)
- Single row: wordmark | headline (24px) + micro body | CTA pill right.

---

## Export notes
- Each HTML file is fixed-size and self-contained; open in a browser and screenshot at 1x (or 2x for retina) to get the PNG.
- Or drop the wording/tokens straight into Boarderless and use Export PNG/PDF from the canvas.
- Keep CTA hit-target ≥ 44px tall in all sizes (met in all four layouts).

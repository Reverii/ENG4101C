# 3D Twin Rebuild and Story Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dashboard's 3D view on Three.js with v11 numbers, and build a 20-minute interactive deck that drives it.

**Architecture:** `index.html` keeps its simulation and UI. Its hand-written painter is removed and a new classic script, `js/twin-scene.js`, draws the same state with Three.js. `Presentation.html` embeds `index.html?embed=1` in an iframe and drives it with `postMessage`.

**Tech Stack:** Plain HTML, CSS and JavaScript. Three.js r160 global build (`vendor/three.min.js`), loaded as a classic script so it works from `file://`. No build step.

**Updated 18 Nov 2026:** written against v8; references now point at proposal v11, whose table numbers differ (handshake Table 18, PLC I/O Table 14, hazard register Table 22).

**Spec:** `docs/superpowers/specs/2026-11-16-3d-twin-and-story-deck-design.md`

## Global Constraints

- Every number on screen comes from `ENG4101C_Project_Proposal_Group5_v11.docx`. A figure with no v11 source is removed or marked illustrative.
- Everything runs from `file://` with no internet. No ES modules, no fetch.
- Planned slide times sum to 1,200 s or less.
- No edits to the Word report. No commit or push unless asked.

## Review Focus

1. Deck opened as a local file: iframe messaging must work with origin `null` (use `postMessage(msg, '*')`, never touch `contentWindow` properties).
2. Twin not yet loaded when a slide sends a command: the deck re-sends the slide's command when the twin reports ready.
3. WebGL unavailable: the twin shows a plain message in the viewport and the rest of the dashboard still runs.
4. Window resized or stage scaled: renderer size and label positions follow the canvas box.
5. Presenter steps backwards: each slide's `_enter` resets the twin to that slide's starting state.

---

### Task 1: Vendor Three.js and strip the old painter

**Files:** Create `vendor/three.min.js`; modify `index.html`.

- [ ] Download `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js` to `vendor/three.min.js`.
- [ ] In `index.html`, delete `getThemeColors` through `buildBuildingScene` (the painter) and the `v*` vector helpers. Keep `cam` and `setCameraPreset`.
- [ ] Add `<script src="vendor/three.min.js"></script>` and `<script src="js/twin-scene.js"></script>` before the main script. Add `<div id="labels3d">` over the canvas.
- [ ] Verify: page loads, console shows only "TwinScene missing" until Task 2.

### Task 2: `js/twin-scene.js`

**Interfaces:**
- Produces: `window.TwinScene.create(canvas, labelLayer, api) -> { render(dt), resize() }` where `api = { state, tiles, cam, consts: { L1, L2, R_MIN, R_MAX }, telemetry() }`.
- Reads `state.scene` (`scara` | `side` | `building`), `state.mission` (`manual` | `survey` | `tapping`), `state.surveyT` (0 to 1), and the existing arm, fan, fault and tile fields.

- [ ] Close-up group: wall, window, ledge, 16 tile quads, reach rings, strike ripple, platform frame, bumpers, fans, arm, hammer, shroud, camera cone, ropes, umbilical, force arrows (side scene only).
- [ ] Building group: ground, block with façade texture, void deck, parapet, roof plant, carrier with winches, ropes, platform, drop strips with tapped stances, drone with flight lines and footprint, gondola (manual mission), ground station, cordon, figures.
- [ ] HTML labels projected each frame; light and dark palettes.
- [ ] Verify in the browser: three scenes, orbit, zoom, presets, tap cycle, each fault, both themes, no console errors.

### Task 3: v11 numbers and labels in `index.html`

- [ ] Constants: mass 20 kg; fans 104 N; wind drag `0.5 × 1.2 × V² × 0.4 × 1.2`; umbilical 230 V AC, 0.90 Ω loop; preload 10 N; joint 3 stroke 60 mm; site wind limit 8 m/s mean.
- [ ] Handshake steps renamed to Table 18's nine steps; tap cycle timed to 1.5 s (0.7, 0.3, 0.3, 0.2).
- [ ] PLC rows renamed to Table 14; faults renamed to wind limit, fan thrust, cable tension NE43, camera residual, e-stop.
- [ ] Header, HUD, telemetry cards and the 7-element tab rewritten from v11. Oscilloscope frequencies marked illustrative.
- [ ] Verify: grep for `28 kg`, `48 V`, `15–20`, `19 `, `v7`, `H15` returns nothing in `index.html`.

### Task 4: Embed mode and message API

**Interfaces:**
- Consumes (from the deck): `{ twin: 1, scene, shot, mission, wind, faults, tap, tile, truth, show, theme, strip, speed, surveyT, play }`.
- Produces (to the deck, 5 Hz): `{ twinState: 1, ready, step, stepId, permit, fault, th1, th2, d3, preload, wind, tiles: [result…], survey: { t, images } }`.

- [ ] `?embed=1` hides everything but the viewport; `strip` shows the handshake and oscilloscopes below it.
- [ ] Camera glides to named shots.
- [ ] Verify with a scratch HTML page that posts each command.

### Task 5: `Presentation.html`

- [ ] Mechanics as in the ENG4100C deck: stage scaling, reveals, timer and plan bar, script panel, presenter view over `BroadcastChannel`, presenter picker, keys.
- [ ] The 20 slides in the spec's table, each with `data-part`, `data-sec`, `data-title` and a `.notes` script.
- [ ] One shared twin iframe moved into the active twin slide's `.twin-slot`; slide hooks send its commands.
- [ ] Verify: walk every slide and reveal forwards and backwards; sum of `data-sec` is 1,140.

### Task 6: `script.html`, copy of dashboard, README

- [ ] `script.html` lists every slide's script by part with word counts, in the ENG4100C layout.
- [ ] Copy `index.html` to `ENG4101C_3D_Robot_Dashboard.html`. Update `README.md` to v11 and the new files.
- [ ] Final check of the spec's "Checks before calling it done" list.

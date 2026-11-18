# ENG4101C Group 5: 3D twin rebuild and story deck

Design note, 16 Nov 2026. Status: approved and built. Updated 18 Nov 2026: the source of truth is now proposal v11 (`ENG4101C_Project_Proposal_Group5_v11.docx`), and table numbers below follow v11.

## Why

The Session 6 oral presentation carries 80% of the marks (problem 15, integrated design 25, engineering reasoning 25, delivery and Q&A 15). The slot is 20 minutes with four presenters. The group wants a deck that works like the ENG4100C one and tells the story with a live 3D model. The current dashboard is drawn on a flat canvas, looks rough, and shows numbers that contradicted the report at the time (v8).

## Goals

1. One 3D digital twin that looks credible on a projector and agrees with the v11 report on every number.
2. A 20-minute interactive deck, built like the ENG4100C deck, where the twin moves with the script.
3. Everything runs from local files with no internet.

## Non-goals

- No edits to the Word report. Report fixes stay a separate list.
- No push to GitHub until asked.
- No new engineering content. The deck and twin show only what v11 says.

## What would make this a failure

- A number on screen that differs from v11.
- A demo that needs internet or stalls on the presentation laptop.
- A deck that runs over 20 minutes.

## Approaches considered

- **A. One twin, embedded in the deck (chosen).** The dashboard stays its own page. The deck embeds it in an iframe and drives it by messages. One model to maintain.
- **B. 3D scenes built into the deck.** Smoother, but the model code exists twice, which is how the v7/v8 mismatch arose.
- **C. Polish the existing canvas.** Least work, but no real lighting, shadows or correct overlap.

The group picked A.

## Files

| File | Role |
|---|---|
| `index.html` | The twin and dashboard (GitHub Pages entry). 3D viewport rebuilt on Three.js. |
| `ENG4101C_3D_Robot_Dashboard.html` | Kept as an identical copy of `index.html`, as today. |
| `vendor/three.module.min.js` | Three.js, saved locally. Downloaded once from the jsDelivr CDN (about 0.7 MB). Approving this note approves that download. |
| `Presentation.html` | The deck. |
| `script.html` | Printable full script, generated from the deck's notes the same way as ENG4100C. |
| `README.md` | Updated to v11 and the new files. |

## Part 1: the twin

### Kept as it is

The simulation logic, the 9-step tap handshake, the 4 × 4 patch grid, the oscilloscopes, the PLC table, the fault buttons, the sliders, the three scene tabs, the camera presets and the light/dark toggle. Only the drawing layer and the constants change.

### New drawing layer

Three.js replaces the hand-written painter. The existing camera state (yaw, pitch, distance, target) drives the Three.js camera, so orbit, zoom and presets behave as before. No extra control library.

- Real lighting: one sun light with soft shadows, plus sky fill. Materials for brushed aluminium, rubber, glass, tile and steel rope.
- **Close-up scene:** tiled wall with grout, a window and an air-conditioner ledge for scale; platform frame with gussets; four bumper pads that change colour on contact; two ducted fans with shrouds, spinning blades and airflow streaks; SCARA arm with shoulder and elbow housings, two links, the joint 3 slide, hammer module, acoustic shroud, microphone and arm camera with its field-of-view cone; two wire ropes and the umbilical; tile colours for solid, hollow, uncertain and crack-skip results; reach rings; strike ripple.
- **Side scene:** the same model seen side-on, with force arrows for fan thrust and wind drag and the joint 3 stroke.
- **Building scene:** the 60 m × 30 m × 20 m block with window bands, balconies, a void deck and a roof parapet; rooftop carrier with two winch drums on rails; ropes and umbilical to the platform; the 200 mm façade grid shown as a faint overlay with tapped patches coloured; the drone with arms, rotors and dual gimbal flying its 21 lines at 15 m standoff with the camera footprint on the wall; ground station, cordoned drop zone and small figures for scale.
- Labels are HTML overlays anchored to 3D points, so they stay sharp and do not collide.

### Numbers synced to v11

| Item | Now | Becomes |
|---|---|---|
| Platform mass | 28 kg | 20 kg |
| Umbilical | 48 V DC | 230 V AC, about 5.3 A, about 4.7 V drop over 65 m |
| Preload | 15–20 N | 10 N (± 1 N window) |
| Joint 3 stroke | 50 mm | 60 mm |
| Drops | 19 | 13 full-height drops, 75 stances each |
| Winch speed | 0.15 m/s | up to 0.3 m/s |
| PLC | on the platform | on the rooftop carrier; the platform box is the arm controller and AC-DC supplies |
| Wind | 49 N at 8 m/s | 60 Pa × 0.4 m² × 1.2 = 29 N at 10 m/s; fans sized for 104 N |
| Fault and interlock labels | H2, H8, H10, V3, H15 with dashboard-only meanings | Renamed to the report's hazard IDs (Table 22), FMEA rows (Table 26) and PLC signals (Table 14) |
| Drop zone label | "30 m (17.6 m drift + 5 m buffer)" | "Cordoned drop zone" with no figure, since v11 gives none |
| Header | "from v7 report" | v11 |

Any dashboard figure with no source in v11 is removed or relabelled, not invented.

### Deck control

- `index.html?embed=1` hides the page chrome and shows only the 3D viewport, with an optional strip for the handshake steps and oscilloscopes.
- The twin listens for `postMessage` commands from the deck: set scene, move the camera to a named shot with a smooth glide, set wind, start or pause the tap cycle, jump to a handshake step, inject or clear a fault, set tile truth, show or hide overlays. This works from local files.
- With no deck present the dashboard behaves exactly as a standalone page.

## Part 2: the deck

### Mechanics (same as ENG4100C)

A 1280 × 720 stage scaled to the window; dark theme; one colour per presenter; → and Space step through reveals then slides; 20:00 timer with plan-versus-actual bar; script under the slide (N); presenter view in a second window (P); full screen (F); keys 1 to 4 jump to each part; presenter picker saved in the browser. D opens the full dashboard over any slide. Presenters default to the ENG4100C order and can be changed in the picker.

### Slides and timing (19 slides, about 19 min, 1 min buffer)

| # | Part | Slide | Interaction | Sec |
|---|---|---|---|---|
| 1 | 1 | Title | | 20 |
| 2 | 1 | The job today: 30,000 buildings, two checks | Reveals | 60 |
| 3 | 1 | Where people hang off the wall | Twin: building with a gondola and the manual rig-tap-de-rig loop | 60 |
| 4 | 1 | Six pain points, in numbers | Click each for its figure and source | 55 |
| 5 | 1 | What we set out to do: objectives and KPIs | Reveals | 45 |
| 6 | 2 | One system, seven elements, one grid | Diagram builds step by step | 60 |
| 7 | 2 | Drone survey | Twin: drone flies its lines; GSD and image counter | 60 |
| 8 | 2 | Façade model and CP Gate 1 | Click cells on a façade map to approve tap targets | 60 |
| 9 | 2 | The robot goes down the wall | Twin: carrier, winch descent, fans on, bumpers green | 60 |
| 10 | 2 | Three CUs in one tap | Live tap; each CU lights up as it acts | 75 |
| 11 | 2 | Who talks to whom: OPC UA, PLC and the hardwired permit | Reveals on the interface map | 50 |
| 12 | 3 | The arm: why SCARA, reach and the worked example | Drag a target; joint angles update | 70 |
| 13 | 3 | Hollow or solid: the tap and its sound | Live oscilloscopes; switch a tile to hollow | 70 |
| 14 | 3 | What happens when things go wrong | Inject a fault; the permit drops and the arm retracts | 75 |
| 15 | 3 | Sizing checks: umbilical, fans, tapping time | Three cards with the working | 70 |
| 16 | 3 | Alternatives we rejected | Table with reveals | 50 |
| 17 | 4 | Cost: break-even and lifecycle | Sliders for platform price and jobs per year | 75 |
| 18 | 4 | Risk before and after | The 15 hazards move across the matrix | 65 |
| 19 | 4 | Validation stages, limits and close | Reveals | 60 |
| 20 | – | Questions | Backup: full dashboard, references | 0 |

Total planned time: 1,140 s (19:00).

### Script

Each slide carries a full speaking script at about 130 words a minute, in plain spoken English, with cues for every click. Handovers name the next presenter.

## Left to the builder

Exact camera shots, colours, model proportions where v11 gives no dimension (drawn to plausible scale and not labelled with invented figures), and the wording of the script.

## Checks before calling it done

- Every number in the twin and deck traced to a line in v11.
- Each scene, the tap cycle and each fault run in the browser with no console errors, in light and dark.
- The deck is walked through end to end, including presenter view, with the internet off.
- Planned times sum to 20:00 or less.

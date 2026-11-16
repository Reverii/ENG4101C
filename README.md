# ENG4101C Group 5: Robotic Façade Inspection for High-Rise Homes

A drone survey and a cable-driven wall-tapping robot, joined into one inspection system for Singapore's Periodic Façade Inspection. This repo holds the presentation deck and the 3D digital twin that support the proposal (`ENG4101C_Project_Proposal_Group5_v8.docx`). Every number on screen comes from proposal v8.

## What is here

| File | What it is |
|---|---|
| [`Presentation.html`](./Presentation.html) | The 20-minute interactive deck (19 slides plus Questions). It drives the 3D twin live. |
| [`script.html`](./script.html) | The printable speaking script, by part and slide, with timings. |
| [`index.html`](./index.html) | The 3D digital twin and dashboard. Live at https://reverii.github.io/ENG4101C/ |
| [`ENG4101C_3D_Robot_Dashboard.html`](./ENG4101C_3D_Robot_Dashboard.html) | A copy of `index.html` under its old name. |
| `js/twin-scene.js` | The Three.js drawing layer for the twin. |
| `vendor/three.min.js` | Three.js r160, saved locally so the 3D view needs no internet. |

Keep these files together in one folder. The deck loads `index.html`, which loads `js/` and `vendor/`.

## Running the deck

Open `Presentation.html` in Chrome or Edge.

| Key | Action |
|---|---|
| → or Space | Next reveal or slide |
| ← | Back |
| T | Start or pause the 20-minute timer |
| N | Show the script under the slide |
| P | Presenter view in a second window |
| D | Open the full dashboard over any slide |
| F | Full screen |
| 1 2 3 4 | Jump to a presenter's part |
| ? | Keys, and who presents each part |

The full dashboard page (`index.html`, or D in the deck) styles its panels with Tailwind from a CDN, so that page needs internet to look right. The 3D view embedded in the slides does not.

## The digital twin

- **Arm close-up:** the 20 kg cable platform, two wall-press fans (104 N), and the 3-joint SCARA arm (L1 = L2 = 0.35 m, 60 mm joint 3) tapping a 16-point, 0.8 m × 0.8 m patch with a 10 N preload.
- **Side view:** fan thrust against wind load on the platform.
- **Whole building:** the 60 m × 30 m × 20 m reference block, with three modes: today's gondola, the drone survey (15 m standoff, 21 flight lines, 193 images on this elevation), and robot tapping from the rooftop carrier.
- **Tap handshake:** the nine steps of proposal Table 14, the rooftop PLC signals of Table 11, and five injectable faults. Every fault ends in the same safe state: brakes set, permit low, arm retracted.
- The oscilloscope traces are illustrative. The proposal gives no tap-sound frequencies.

## Design notes

- Design: [`docs/superpowers/specs/2026-11-16-3d-twin-and-story-deck-design.md`](./docs/superpowers/specs/2026-11-16-3d-twin-and-story-deck-design.md)
- Build plan: [`docs/superpowers/plans/2026-11-16-3d-twin-and-story-deck.md`](./docs/superpowers/plans/2026-11-16-3d-twin-and-story-deck.md)

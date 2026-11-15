# ENG4101C — Hybrid Drone & Cable-Suspended Façade Inspection Robot (Group 5)

Interactive **3D Robot Digital Twin & SCADA Engineering Dashboard** supporting the ENG4101C Group 5 Robotic Automation Integration proposal (`ENG4101C_Project_Proposal_Group5_v7.docx`).

## Live Interactive Dashboard (GitHub Pages)

- **Live URL:** https://reverii.github.io/ENG4101C/
- **Standalone File:** [`index.html`](./index.html) / [`ENG4101C_3D_Robot_Dashboard.html`](./ENG4101C_3D_Robot_Dashboard.html)
- **Proposal Document:** [`ENG4101C_Project_Proposal_Group5_v7.docx`](./ENG4101C_Project_Proposal_Group5_v7.docx)

## Key Capabilities Visualised

1. **Three 3D Interactive Views:**
   - **3D SCARA Close-Up:** 28 kg (`0.9 m × 0.9 m`) cable-suspended frame, dual `55 N` ducted thruster fans, 2-DOF planar SCARA arm ($L_1 = L_2 = 0.35\text{ m}$), `50 mm` Z-compliance slide, compliant acoustic shroud, and `1080p` arm alignment camera.
   - **Side Z-Compliance & Wind Profile:** Real-time balance of `110 N` normal fan preload vs aerodynamic wind drag ($\frac{1}{2}\rho V^2 C_d A = 49.0\text{ N}$ at `8.0 m/s`).
   - **20-Storey Building System Integration (`60 m × 30 m × 20 m`):** Rooftop two-winch carrier (`1.5×` proof-tested), `19` vertical drops, `30 m` cordoned safety perimeter, ground SCADA (`L2/L3`), and DJI Matrice 350 RTK (`P1 + H30T`) under the `H15` sequential phase lock.
2. **Analytical Kinematics & Electrical Telemetry:**
   - Dual-branch 2-link SCARA Inverse Kinematics covering the 16-point `0.8 m × 0.8 m` patch (`r_min = 0.122 m`, `19.9 mm` inner clearance, `|det(J)| >= 0.042 m²`).
   - Live `EN 12385` rope tensions, safety factor, and `65 m` `48 V DC` umbilical current/voltage-drop telemetry.
3. **9-Step Tap Handshake, Dual Oscilloscopes & PLC Fault Injection:**
   - Live `1 kHz` load-cell impulse (`15–20 N` shroud preload + `5–15 N` strike) & `48 kHz` acoustic ringdown + FFT (`0.95 kHz` Hollow vs `2.84 kHz` Solid).
   - Live PLC channel monitors (`%IX0.0`–`%QX0.2`) and hardware fault triggers (`H2`, `H8 NAMUR NE43`, `H10`, `V3`, `H15`).

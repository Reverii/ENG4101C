/* ENG4101C Group 5 digital twin: Three.js drawing layer.
   Draws the simulation state owned by index.html. It holds no engineering numbers of its own
   except the reference block and flight geometry stated in proposal v11 (60 m x 30 m x 20 m block,
   15 m standoff, 21 flight lines 2.86 m apart, 10.8 m x 7.2 m image footprint, 0.8 m drop strips).
   Proportions with no dimension in v11 (frame, carrier, drone, figures) are drawn to plausible scale. */
(function () {
  'use strict';
  const T = window.THREE;

  const BLOCK = { w: 30, h: 60, d: 20, voidDeck: 3 };
  const STRIP_X = [-9, -3, 3, 9];          // 4 of the block's 13 drops fall on this 30 m elevation
  const STANCES_PER_DROP = 75;             // 60 m / 0.8 m
  const STANDOFF = 15;
  const LINES = 21, LINE_GAP = 2.86, FOOT_W = 10.8, FOOT_H = 7.2;
  const IMAGES_FRONT = 193;                // 1,800 m2 / (3.24 m x 2.88 m)
  const FLAGS = [[-9, 44.2], [-3, 21.0], [3, 50.6], [9, 12.2], [3, 33.4], [12.6, 39.0]];

  function create(canvas, labelLayer, api) {
    if (!T) return null;
    const { state, tiles, cam, consts } = api;
    const { L1, L2, R_MIN, R_MAX } = consts;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(42, 1, 0.05, 900);
    const hemi = new T.HemisphereLight(0xffffff, 0x445066, 0.95);
    const sun = new T.DirectionalLight(0xfff4e0, 2.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    const fill = new T.DirectionalLight(0x9fc4ff, 0.45);
    scene.add(hemi, sun, sun.target, fill);

    /* ---------- helpers ---------- */
    const M = (color, rough = 0.6, metal = 0.1, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra || {}));
    const B = (color, opacity = 1) => new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: T.DoubleSide });
    const sh = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
    const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = sh(new T.Mesh(new T.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; };
    const cylZ = (r, len, mat, seg = 24, r2) => { const g = new T.CylinderGeometry(r2 == null ? r : r2, r, len, seg); g.rotateX(Math.PI / 2); return sh(new T.Mesh(g, mat)); };
    const cylY = (r, len, mat, seg = 20) => sh(new T.Mesh(new T.CylinderGeometry(r, r, len, seg), mat));
    const cylX = (r, len, mat, seg = 20) => { const g = new T.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); return sh(new T.Mesh(g, mat)); };
    const UP = new T.Vector3(0, 1, 0), tmpA = new T.Vector3(), tmpB = new T.Vector3(), tmpD = new T.Vector3();
    const rod = (r, mat) => sh(new T.Mesh(new T.CylinderGeometry(r, r, 1, 10), mat));
    const setRod = (mesh, a, b) => {
      tmpD.subVectors(b, a); const len = tmpD.length() || 1e-6;
      mesh.position.copy(a).addScaledVector(tmpD, 0.5);
      mesh.quaternion.setFromUnitVectors(UP, tmpD.multiplyScalar(1 / len));
      mesh.scale.set(1, len, 1);
    };
    const lineOf = (pts, color, dashed = false, opacity = 1, loop = false) => {
      const g = new T.BufferGeometry().setFromPoints(pts);
      const m = dashed ? new T.LineDashedMaterial({ color, dashSize: 0.04, gapSize: 0.03, transparent: opacity < 1, opacity })
                       : new T.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
      const l = loop ? new T.LineLoop(g, m) : new T.Line(g, m);
      if (dashed) l.computeLineDistances();
      return l;
    };
    const circlePts = (r, n, z = 0) => { const a = []; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; a.push(new T.Vector3(r * Math.cos(t), r * Math.sin(t), z)); } return a; };
    const person = (color, scale = 1) => {
      const g = new T.Group();
      const body = cylY(0.2, 1.05, M(color, 0.8, 0)); body.position.y = 0.95;
      const legs = cylY(0.16, 0.45, M(0x26303f, 0.9, 0)); legs.position.y = 0.22;
      const head = sh(new T.Mesh(new T.SphereGeometry(0.15, 12, 10), M(0xe2b594, 0.8, 0))); head.position.y = 1.62;
      const hat = sh(new T.Mesh(new T.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf8fafc, 0.5, 0))); hat.position.y = 1.66;
      g.add(body, legs, head, hat); g.scale.setScalar(scale); return g;
    };

    /* ---------- labels (HTML, projected each frame) ---------- */
    if (!document.getElementById('l3d-style')) {
      const st = document.createElement('style'); st.id = 'l3d-style';
      st.textContent = '#labels3d{position:absolute;inset:0;overflow:hidden;pointer-events:none}' +
        '.l3d{position:absolute;left:0;top:0;white-space:nowrap;font:600 10.5px ui-monospace,SFMono-Regular,Consolas,monospace;padding:2px 6px;border-radius:4px;' +
        'background:rgba(8,14,24,.78);color:#e2e8f0;border:1px solid rgba(148,163,184,.4);will-change:transform}' +
        '.l3d i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:0}' +
        'html.light .l3d{background:rgba(255,255,255,.88);color:#0f172a;border-color:rgba(71,85,105,.4)}' +
        'html.embed .l3d{font-size:12.5px;padding:3px 8px}';
      document.head.appendChild(st);
    }
    const labels = [];
    const addLabel = (group, color, posFn, textFn, when) => {
      const el = document.createElement('div'); el.className = 'l3d'; el.style.display = 'none';
      const dot = document.createElement('i'); dot.style.background = color;
      const span = document.createElement('span'); el.append(dot, span); labelLayer.appendChild(el);
      labels.push({ el, span, group, posFn, textFn, when, last: '', w: 0, x: 0, y: 0, on: false });
    };

    /* ====================================================================
       CLOSE-UP: wall patch, platform, arm
       ==================================================================== */
    const close = new T.Group(); scene.add(close);

    const tileTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 500; const x = c.getContext('2d');
      x.fillStyle = '#8f9aa8'; x.fillRect(0, 0, 500, 500);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const v = 214 + ((i * 7 + j * 13) % 5) * 5;
        x.fillStyle = 'rgb(' + v + ',' + (v + 3) + ',' + (v + 8) + ')';
        x.fillRect(i * 100 + 3, j * 100 + 3, 94, 94);
        x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(i * 100 + 3, j * 100 + 3, 94, 5);
      }
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
    })();
    const wallTexA = tileTex.clone(); wallTexA.repeat.set(9.2, 6.4); wallTexA.needsUpdate = true;
    const wallMat = M(0xffffff, 0.75, 0, { map: wallTexA });
    const wall = box(9.2, 6.4, 0.12, [M(0x9aa5b4), M(0x9aa5b4), M(0x9aa5b4), M(0x9aa5b4), wallMat, M(0x808b9a)], 0, 0, -0.06);
    wall.castShadow = false; close.add(wall);

    // window and air-conditioner ledge: outside the robot's flat-area scope
    const alu = M(0xc3ccd8, 0.4, 0.25), aluDark = M(0x6b7787, 0.5, 0.25), rubber = M(0x1b222c, 0.9, 0), steel = M(0xd5dce6, 0.35, 0.35);
    const win = new T.Group(); win.position.set(1.25, 0.25, 0);
    win.add(box(0.72, 1.12, 0.05, aluDark, 0, 0, 0.02));
    win.add(box(0.62, 1.02, 0.02, M(0x3b6ea8, 0.08, 0.7, { transparent: true, opacity: 0.9 }), 0, 0, 0.045));
    win.add(box(0.03, 1.02, 0.03, aluDark, 0, 0, 0.055));
    win.add(box(0.86, 0.07, 0.3, M(0xb9c2cd, 0.8, 0), 0, -0.68, 0.15));
    win.add(box(0.62, 0.36, 0.24, M(0xe8edf2, 0.6, 0.1), 0, -0.46, 0.17));
    win.add(cylZ(0.13, 0.02, M(0x2a3340, 0.6, 0.3), 20).translateX(-0.12).translateY(-0.46).translateZ(0.3));
    close.add(win);
    addLabel('close', '#94a3b8', () => tmpA.set(1.25, 0.95, 0.1), () => 'Window and AC ledge: manual check');

    // patch outline, reach rings, tile overlays
    const patch = lineOf([new T.Vector3(-0.4, -0.4, 0.004), new T.Vector3(0.4, -0.4, 0.004), new T.Vector3(0.4, 0.4, 0.004), new T.Vector3(-0.4, 0.4, 0.004)], 0xf8fafc, false, 0.85, true);
    close.add(patch);
    const ringOuter = lineOf(circlePts(R_MAX, 96, 0.006), 0x60a5fa, true, 0.95);
    const ringInner = lineOf(circlePts(R_MIN, 48, 0.006), 0xf87171, false, 0.95);
    close.add(ringOuter, ringInner);
    addLabel('close', '#60a5fa', () => tmpA.set(-0.5, 0.52, 0.01), () => 'Reach limit 0.70 m', () => state.showWorkspace);
    addLabel('close', '#f87171', () => tmpA.set(0.2, -0.02, 0.01), () => 'Fold limit 0.122 m', () => state.showWorkspace && state.scene === 'scara');

    const RESULT_COL = { SOLID: 0x10b981, HOLLOW: 0xef4444, UNCERTAIN: 0xf59e0b, CRACK_SKIP: 0xfbbf24 };
    const tileMeshes = tiles.map((t) => {
      const m = new T.Mesh(new T.PlaneGeometry(0.188, 0.188), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false }));
      m.position.set(t.x, t.y, 0.003); close.add(m);
      const crack = lineOf([new T.Vector3(-0.06, -0.055, 0.005), new T.Vector3(-0.02, -0.005, 0.005), new T.Vector3(0.005, 0.0, 0.005), new T.Vector3(0.03, 0.04, 0.005), new T.Vector3(0.062, 0.058, 0.005)], 0x3b2a12);
      crack.position.set(t.x, t.y, 0); crack.material.linewidth = 2; close.add(crack);
      const dot = new T.Mesh(new T.CircleGeometry(0.012, 16), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      dot.position.set(t.x, t.y, 0.0045); close.add(dot);
      return { m, crack, dot };
    });
    const selRing = new T.Mesh(new T.RingGeometry(0.07, 0.078, 40), B(0x38bdf8, 0.95)); selRing.position.z = 0.007; close.add(selRing);
    const ripple = new T.Mesh(new T.RingGeometry(0.9, 1, 48), B(0x10b981, 1)); ripple.position.z = 0.008; ripple.visible = false; close.add(ripple);

    // ropes and umbilical (close-up: run off the top of the view)
    const ropeMat = M(0xd7dde5, 0.45, 0.6), ropeBad = M(0xef4444, 0.5, 0.2), umbMat = M(0xf97316, 0.7, 0);
    const cRopeL = rod(0.008, ropeMat), cRopeR = rod(0.008, ropeMat), cUmb = rod(0.013, umbMat);
    close.add(cRopeL, cRopeR, cUmb);
    addLabel('close', '#e2e8f0', () => tmpA.set(-0.44, 1.02, platZ()), () => 'Two cables, breaking load at least 1 kN each');
    addLabel('close', '#f97316', () => tmpA.set(0.12, 1.2, platZ()), () => 'Umbilical: 230 V AC, Cat6A, two hardwired interlock pairs');

    /* ---------- platform (shared with the building scene) ---------- */
    const plat = new T.Group();
    const FZ_CONTACT = 0.235, FZ_FREE = 0.29;
    let fz = FZ_FREE;
    const platZ = () => fz;
    [[0, 0.4375, 0.92, 0.045], [0, -0.4375, 0.92, 0.045]].forEach(([x, y, w, h]) => plat.add(box(w, h, 0.045, alu, x, y, 0)));
    [[-0.4375, 0], [0.4375, 0]].forEach(([x, y]) => plat.add(box(0.045, 0.83, 0.045, alu, x, y, 0)));
    plat.add(box(0.09, 0.83, 0.03, aluDark, 0, 0, 0.05));                       // spine carrying the arm base
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
      const g = box(0.16, 0.035, 0.006, alu, sx * 0.375, sy * 0.375, 0.026); g.rotation.z = -sx * sy * Math.PI / 4; plat.add(g);
      const eye = sh(new T.Mesh(new T.TorusGeometry(0.018, 0.005, 8, 16), steel)); eye.position.set(sx * 0.38, 0.47, 0); if (sy > 0) plat.add(eye);
    });
    const padMats = [];
    [[-0.41, 0.41], [0.41, 0.41], [-0.41, -0.41], [0.41, -0.41]].forEach(([x, y]) => {
      const st = cylZ(0.016, 0.2, steel, 12); st.position.set(x, y, -0.1); plat.add(st);
      const pm = M(0xf59e0b, 0.9, 0); padMats.push(pm);
      const pad = cylZ(0.04, 0.03, pm, 20, 0.034); pad.position.set(x, y, -0.22); plat.add(pad);
    });
    // controller box and umbilical gland
    const ctrl = box(0.3, 0.1, 0.12, M(0x334155, 0.5, 0.2), 0.2, 0.51, 0.02); plat.add(ctrl);
    const led = box(0.014, 0.014, 0.004, new T.MeshBasicMaterial({ color: 0x10b981 }), 0.31, 0.53, 0.082); plat.add(led);
    plat.add(cylY(0.018, 0.05, rubber, 10).translateX(-0.08).translateY(0.485).translateZ(0.02));
    addLabel('both', '#94a3b8', () => plat.localToWorld(tmpA.set(0.2, 0.62, 0.05)), () => 'Arm controller and AC-DC supplies', () => state.scene !== 'building');

    // ducted fans: exhaust away from the wall, so thrust presses the platform onto it
    const fans = [];
    [[-0.3, -0.28], [0.3, -0.28]].forEach(([x, y]) => {
      const g = new T.Group(); g.position.set(x, y, 0.085);
      const shMat = M(0x334155, 0.5, 0.3, { side: T.DoubleSide });
      const shroud = sh(new T.Mesh((() => { const q = new T.CylinderGeometry(0.098, 0.09, 0.13, 32, 1, true); q.rotateX(Math.PI / 2); return q; })(), shMat));
      const lip = sh(new T.Mesh(new T.TorusGeometry(0.094, 0.008, 8, 32), shMat)); lip.position.z = -0.065;
      const lip2 = sh(new T.Mesh(new T.TorusGeometry(0.098, 0.006, 8, 32), shMat)); lip2.position.z = 0.065;
      const hub = cylZ(0.024, 0.06, M(0x0f172a, 0.5, 0.4), 16);
      const rotor = new T.Group();
      const bladeMat = M(0x38bdf8, 0.4, 0.2);
      for (let b = 0; b < 5; b++) { const bl = box(0.066, 0.026, 0.004, bladeMat, 0.052, 0, 0); bl.rotation.x = 0.5; const h = new T.Group(); h.rotation.z = (b / 5) * Math.PI * 2; h.add(bl); rotor.add(h); }
      const stator = new T.Group();
      for (let b = 0; b < 3; b++) { const s = box(0.18, 0.008, 0.012, aluDark, 0, 0, 0.05); s.rotation.z = (b / 3) * Math.PI; stator.add(s); }
      const mount = box(0.03, 0.12, 0.03, aluDark, 0, -0.12, -0.07);
      g.add(shroud, lip, lip2, hub, rotor, stator, mount); plat.add(g);
      const streaks = [];
      for (let i = 0; i < 10; i++) { const s = new T.Mesh(new T.CylinderGeometry(0.0022, 0.0022, 0.06, 5).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.6, depthWrite: false })); g.add(s); streaks.push(s); }
      fans.push({ g, rotor, shMat, streaks, spin: 0 });
    });
    addLabel('both', '#38bdf8', () => plat.localToWorld(tmpA.set(0.3, -0.5, 0.12)), () => 'Wall-press fans ' + api.telemetry().fanPreloadN.toFixed(0) + ' N', () => state.scene !== 'building');

    // SCARA arm: joints 1 and 2 turn in the wall plane, joint 3 slides normal to the wall
    const link1Mat = M(0x2563eb, 0.45, 0.25), link2Mat = M(0x0891b2, 0.45, 0.25), servoMat = M(0x1e293b, 0.5, 0.4), accent = M(0xf59e0b, 0.5, 0.3);
    const g1 = new T.Group(); plat.add(g1);
    const base = cylZ(0.06, 0.07, servoMat, 28); base.position.z = 0.0; g1.add(base);
    const baseRing = cylZ(0.064, 0.012, accent, 28); baseRing.position.z = -0.03; g1.add(baseRing);
    const l1 = new T.Group(); g1.add(l1);
    l1.add(box(L1, 0.062, 0.034, link1Mat, L1 / 2, 0, -0.045));
    l1.add(box(L1 - 0.12, 0.02, 0.012, M(0x1e3a8a, 0.5, 0.2), L1 / 2, 0, -0.024));
    l1.add(cylZ(0.031, 0.034, link1Mat, 20).translateZ(-0.045));
    const g2 = new T.Group(); g2.position.x = L1; l1.add(g2);
    g2.add(cylZ(0.048, 0.085, servoMat, 24).translateZ(-0.05));
    g2.add(cylZ(0.051, 0.01, accent, 24).translateZ(-0.008));
    g2.add(box(L2, 0.05, 0.03, link2Mat, L2 / 2, 0, -0.085));
    g2.add(cylZ(0.025, 0.03, link2Mat, 20).translateZ(-0.085));
    const gw = new T.Group(); gw.position.x = L2; g2.add(gw);                   // wrist frame, kept square to the wall
    gw.add(cylZ(0.032, 0.11, servoMat, 20).translateZ(-0.065));                 // joint 3 slide housing
    gw.add(cylZ(0.022, 0.07, M(0x334155, 0.5, 0.4), 16).translateZ(0.01));      // joint 3 motor
    const SLIDE_END = -0.12, TOOL_LEN = 0.073;
    const j3rod = cylZ(0.011, 1, steel, 12); gw.add(j3rod);
    const tool = new T.Group(); gw.add(tool);
    tool.add(cylZ(0.024, 0.03, M(0x475569, 0.5, 0.4), 16).translateZ(-0.015)); // solenoid and load cell
    const shroudMat = M(0xf59e0b, 0.85, 0);
    tool.add(cylZ(0.046, 0.04, shroudMat, 24, 0.026).translateZ(-0.05));       // compliant acoustic shroud
    const hammer = cylZ(0.008, 0.03, M(0xf8fafc, 0.3, 0.6), 12); tool.add(hammer);
    tool.add(cylZ(0.007, 0.03, rubber, 8).translateX(0.034).translateZ(-0.03)); // microphone
    const camBody = box(0.04, 0.036, 0.04, M(0x0f172a, 0.4, 0.4), 0, 0.066, -0.075); gw.add(camBody);
    gw.add(cylZ(0.012, 0.014, M(0x38bdf8, 0.2, 0.6), 14).translateY(0.066).translateZ(-0.1));
    const fovGeo = new T.BufferGeometry(); fovGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(48), 3));
    const fov = new T.LineSegments(fovGeo, new T.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 })); gw.add(fov);
    addLabel('close', '#38bdf8', () => gw.localToWorld(tmpA.set(0, 0.16, -0.07)), () => {
      if (state.scene === 'side') return 'Joint 3: ' + state.d3_mm.toFixed(0) + ' mm, preload ' + state.shroudPreloadN.toFixed(1) + ' N';
      return 'Hammer, microphone, arm camera';
    });

    // side-scene force arrows
    const arrThrust = new T.ArrowHelper(new T.Vector3(0, 0, -1), new T.Vector3(), 0.3, 0x10b981, 0.07, 0.045);
    const arrWind = new T.ArrowHelper(new T.Vector3(0, 0, 1), new T.Vector3(), 0.3, 0xef4444, 0.07, 0.045);
    close.add(arrThrust, arrWind);
    addLabel('close', '#10b981', () => tmpA.set(0, -0.66, fz + 0.52), () => 'Fan thrust ' + api.telemetry().fanPreloadN.toFixed(0) + ' N onto the wall', () => state.scene === 'side');
    addLabel('close', '#ef4444', () => tmpA.set(0, 0.62, fz + 0.42), () => { const t = api.telemetry(); return 'Wind load ' + t.windDragN.toFixed(0) + ' N at ' + t.effWind.toFixed(1) + ' m/s'; }, () => state.scene === 'side');

    /* ====================================================================
       BUILDING: reference block, roof carrier, drone, ground
       ==================================================================== */
    const bld = new T.Group(); scene.add(bld);
    const groundMat = M(0x7d8b78, 0.95, 0);
    const ground = sh(new T.Mesh(new T.CircleGeometry(220, 64), groundMat), false, true); ground.rotation.x = -Math.PI / 2; bld.add(ground);
    const paveMat = M(0xb8bfc8, 0.9, 0);
    const pave = box(64, 0.06, 44, paveMat, 0, 0.03, 2); pave.castShadow = false; bld.add(pave);
    const road = box(200, 0.05, 7, M(0x4a515c, 0.95, 0), 0, 0.025, 34); road.castShadow = false; bld.add(road);
    for (let i = 0; i < 12; i++) {
      const tx = -55 + i * 10, tz = 27.5;
      const tr = cylY(0.18, 2.4, M(0x6b4f3a, 0.9, 0), 8); tr.position.set(tx, 1.2, tz);
      const cr = sh(new T.Mesh(new T.SphereGeometry(1.7, 10, 8), M(0x3f7d4a, 0.9, 0))); cr.position.set(tx, 3.6, tz); cr.scale.y = 1.25;
      bld.add(tr, cr);
    }

    const facadeTex = (bays) => {
      const c = document.createElement('canvas'); c.width = bays * 96; c.height = 19 * 96; const x = c.getContext('2d');
      x.fillStyle = '#e9e4d8'; x.fillRect(0, 0, c.width, c.height);
      for (let s = 0; s < 19; s++) {
        const y0 = s * 96;
        x.fillStyle = '#cfc8b8'; x.fillRect(0, y0, c.width, 5);
        for (let b = 0; b < bays; b++) {
          const x0 = b * 96, k = (s * 31 + b * 17) % 9;
          x.fillStyle = '#b7b0a2'; x.fillRect(x0 + 19, y0 + 21, 58, 58);
          const g = x.createLinearGradient(0, y0 + 24, 0, y0 + 76);
          g.addColorStop(0, k === 2 ? '#d9c98a' : '#4f6f93'); g.addColorStop(1, k === 2 ? '#bfae6e' : '#22364f');
          x.fillStyle = g; x.fillRect(x0 + 22, y0 + 24, 52, 52);
          x.fillStyle = '#b7b0a2'; x.fillRect(x0 + 47, y0 + 24, 2, 52);
          if (k % 3 === 0) { x.fillStyle = 'rgba(240,236,226,.75)'; x.fillRect(x0 + 22, y0 + 24, 25, 30 + (k * 3)); }
          if ((b + s) % 2 === 0) { x.fillStyle = '#d7dbe0'; x.fillRect(x0 + 30, y0 + 81, 34, 11); x.fillStyle = '#9aa2ad'; x.fillRect(x0 + 30, y0 + 91, 34, 2); }
        }
      }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    const frontMat = M(0xffffff, 0.85, 0, { map: facadeTex(10) }), sideMat = M(0xffffff, 0.85, 0, { map: facadeTex(7) });
    const plain = M(0xddd7ca, 0.9, 0);
    const bodyH = BLOCK.h - BLOCK.voidDeck;
    bld.add(box(BLOCK.w, bodyH, BLOCK.d, [sideMat, sideMat, plain, plain, frontMat, frontMat], 0, BLOCK.voidDeck + bodyH / 2, -BLOCK.d / 2));
    bld.add(box(BLOCK.w - 7, BLOCK.voidDeck, BLOCK.d - 7, M(0x8e8a80, 0.9, 0), 0, BLOCK.voidDeck / 2, -BLOCK.d / 2));
    for (let i = 0; i <= 10; i++) for (const z of [-0.35, -BLOCK.d + 0.35]) bld.add(box(0.7, BLOCK.voidDeck, 0.7, plain, -15 + 0.35 + i * 2.93, BLOCK.voidDeck / 2, z));
    // roof: parapet, plant
    const par = M(0xcfc8b8, 0.9, 0);
    bld.add(box(BLOCK.w, 1.0, 0.25, par, 0, 60.5, -0.125), box(BLOCK.w, 1.0, 0.25, par, 0, 60.5, -BLOCK.d + 0.125), box(0.25, 1.0, BLOCK.d, par, -14.875, 60.5, -10), box(0.25, 1.0, BLOCK.d, par, 14.875, 60.5, -10));
    bld.add(box(7, 3.2, 5, M(0xc9c3b6, 0.9, 0), 6, 61.6, -13));
    const tank = cylY(1.6, 2.6, M(0xaeb6c0, 0.5, 0.4), 20); tank.position.set(-8, 61.3, -14); bld.add(tank);
    for (let b = 0; b < 3; b++) { const o = box(22, 36 + b * 9, 16, [sideMat, sideMat, plain, plain, sideMat, sideMat], -78 + b * 70, (36 + b * 9) / 2, -70 - b * 12); bld.add(o); }

    // drop strips and tapped stances
    const strips = new T.Group(); bld.add(strips);
    STRIP_X.forEach((x) => strips.add(lineOf([new T.Vector3(x - 0.4, 3, 0.03), new T.Vector3(x + 0.4, 3, 0.03), new T.Vector3(x + 0.4, 60, 0.03), new T.Vector3(x - 0.4, 60, 0.03)], 0x38bdf8, false, 0.75, true)));
    const stanceGeo = new T.PlaneGeometry(0.74, 0.74);
    const stances = new T.InstancedMesh(stanceGeo, new T.MeshBasicMaterial({ transparent: true, opacity: 0.78, depthWrite: false }), STRIP_X.length * STANCES_PER_DROP);
    stances.instanceMatrix.setUsage(T.DynamicDrawUsage); bld.add(stances);
    const dummy = new T.Object3D(), colG = new T.Color(0x10b981), colR = new T.Color(0xef4444);
    for (let s = 0; s < STRIP_X.length; s++) for (let i = 0; i < STANCES_PER_DROP; i++) stances.setColorAt(s * STANCES_PER_DROP + i, ((i * 7 + s * 13) % 23 === 4 || (i + s * 5) % 31 === 9) ? colR : colG);
    const flagMeshes = FLAGS.map(([x, y]) => { const m = new T.Mesh(new T.RingGeometry(0.75, 1.0, 28), B(0xf59e0b, 0.95)); m.position.set(x, y, 0.06); bld.add(m); return m; });
    addLabel('building', '#f59e0b', () => tmpA.set(12.6, 41.2, 0.2), () => 'AI flag: CP reviews every one', () => flagMeshes[5].visible);

    // rooftop carrier
    const carrier = new T.Group(); bld.add(carrier);
    bld.add(box(BLOCK.w - 1, 0.1, 0.12, steel, 0, 60.05, -1.0), box(BLOCK.w - 1, 0.1, 0.12, steel, 0, 60.05, -2.6));
    carrier.add(box(2.4, 0.3, 2.0, M(0x475569, 0.5, 0.4), 0, 60.4, -1.8));
    [[-1, -1.0], [1, -1.0], [-1, -2.6], [1, -2.6]].forEach(([sx, z]) => carrier.add(cylZ(0.14, 0.12, rubber, 14).translateX(sx * 0.95).translateY(60.19).translateZ(z)));
    const drums = [];
    [-0.55, 0.55].forEach((x) => {
      const d = cylX(0.26, 0.6, M(0xd97706, 0.5, 0.3), 20); d.position.set(x, 60.9, -1.7); carrier.add(d); drums.push(d);
      carrier.add(cylX(0.36, 0.04, aluDark, 20).translateX(x - 0.31).translateY(60.9).translateZ(-1.7), cylX(0.36, 0.04, aluDark, 20).translateX(x + 0.31).translateY(60.9).translateZ(-1.7));
      const jib = box(0.12, 0.14, 2.5, M(0xeab308, 0.5, 0.3), x * 0.85, 61.35, -0.62); jib.rotation.x = -0.1; carrier.add(jib);
      carrier.add(cylX(0.12, 0.06, steel, 16).translateX(x * 0.85).translateY(61.25).translateZ(0.55));
      carrier.add(box(0.1, 0.9, 0.1, aluDark, x * 0.85, 60.95, -1.05));
    });
    carrier.add(box(1.6, 0.7, 0.5, M(0x1f2937, 0.8, 0.1), 0, 60.9, -2.9));    // counterweights
    carrier.add(box(0.55, 0.85, 0.35, M(0xe5e7eb, 0.5, 0.2), 1.45, 60.98, -1.9));  // safety PLC cabinet
    carrier.add(box(0.06, 0.06, 0.02, new T.MeshBasicMaterial({ color: 0x10b981 }), 1.45, 61.25, -1.715));
    const mast = cylY(0.03, 2.2, steel, 8); mast.position.set(-1.6, 61.6, -1.9); carrier.add(mast);
    carrier.add(box(0.5, 0.03, 0.03, steel, -1.6, 62.7, -1.9), box(0.03, 0.03, 0.5, steel, -1.6, 62.7, -1.9));
    const attendant = person(0xf97316); attendant.position.set(2.9, 60, -2.4); carrier.add(attendant);
    const bRopeL = rod(0.035, ropeMat), bRopeR = rod(0.035, ropeMat), bUmb = rod(0.05, umbMat); bld.add(bRopeL, bRopeR, bUmb);
    addLabel('building', '#eab308', () => tmpA.set(carrier.position.x, 63.6, -1.8), () => 'Rooftop carrier: safety PLC, two winches, spring brakes', () => state.mission === 'tapping');
    addLabel('building', '#38bdf8', () => tmpA.set(carrier.position.x + 3.4, state.elevY, 0.6), () => 'Cable robot at ' + state.elevY.toFixed(0) + ' m: ' + (state.bumperContact ? 'on the wall' : 'moving'), () => state.mission === 'tapping');
    addLabel('building', '#10b981', () => tmpA.set(STRIP_X[0] - 3.2, 52, 0.3), () => 'Tapped stances: green solid, red hollow', () => state.mission === 'tapping' && stances.count > 6);

    // gondola (today's manual close-range check)
    const gondola = new T.Group(); bld.add(gondola);
    const gMat = M(0xdc2626, 0.6, 0.3);
    gondola.add(box(2.2, 0.08, 0.75, M(0x6b7280, 0.7, 0.3), 0, 0, 0));
    [[0, 0.55, 0.36], [0, 0.55, -0.36], [0, 1.05, 0.36], [0, 1.05, -0.36]].forEach(([x, y, z]) => gondola.add(box(2.2, 0.05, 0.05, gMat, x, y, z)));
    [[-1.08, 0.36], [1.08, 0.36], [-1.08, -0.36], [1.08, -0.36]].forEach(([x, z]) => gondola.add(box(0.05, 1.05, 0.05, gMat, x, 0.52, z)));
    const w1 = person(0xfacc15), w2 = person(0xf97316); w1.position.set(-0.45, 0.04, 0); w2.position.set(0.5, 0.04, 0); gondola.add(w1, w2);
    const gRopeL = rod(0.03, ropeMat), gRopeR = rod(0.03, ropeMat); bld.add(gRopeL, gRopeR);
    const davits = new T.Group(); bld.add(davits);
    [-1.0, 1.0].forEach((x) => { const j = box(0.14, 0.16, 3.0, M(0xeab308, 0.5, 0.3), x, 61.3, -0.8); davits.add(j, box(0.9, 0.6, 0.5, M(0x1f2937, 0.8, 0.1), x, 60.3, -2.4)); });
    addLabel('building', '#ef4444', () => tmpA.set(gondola.position.x + 4.6, gondola.position.y + 1.2, 0.8), () => 'Gondola: two people tapping by hand', () => state.mission === 'manual');

    // drone (drawn at twice true size so it reads on a projector)
    const drone = new T.Group(); bld.add(drone);
    const dBody = M(0x1f2937, 0.5, 0.3), props = [];
    drone.add(box(0.42, 0.2, 0.52, dBody, 0, 0, 0), box(0.3, 0.1, 0.34, M(0x374151, 0.5, 0.3), 0, 0.13, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const a = rod(0.022, dBody); setRod(a, new T.Vector3(0, 0.02, 0), new T.Vector3(sx * 0.44, 0.08, sz * 0.44)); drone.add(a);
      drone.add(cylY(0.045, 0.09, M(0x0f172a, 0.4, 0.5), 12).translateX(sx * 0.44).translateY(0.1).translateZ(sz * 0.44));
      const p = new T.Group(); p.position.set(sx * 0.44, 0.16, sz * 0.44);
      p.add(new T.Mesh(new T.CircleGeometry(0.27, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false })));
      p.add(box(0.52, 0.006, 0.035, M(0x111827, 0.5, 0.2)));
      drone.add(p); props.push(p);
    });
    [-0.16, 0.16].forEach((x) => { drone.add(cylY(0.012, 0.36, dBody, 6).translateX(x).translateY(-0.26), box(0.03, 0.02, 0.5, dBody, x, -0.44, 0)); drone.add(cylY(0.02, 0.07, M(0xf8fafc, 0.4, 0.2), 8).translateX(x).translateY(0.22).translateZ(0.12)); });
    drone.add(box(0.13, 0.13, 0.16, M(0xd1d5db, 0.4, 0.3), -0.11, -0.2, -0.2), cylZ(0.05, 0.1, M(0x111827, 0.3, 0.5), 14).translateX(-0.11).translateY(-0.2).translateZ(-0.32));
    drone.add(box(0.15, 0.13, 0.15, M(0x111827, 0.4, 0.4), 0.12, -0.2, -0.2));
    drone.add(new T.Mesh(new T.SphereGeometry(0.03, 8, 6), new T.MeshBasicMaterial({ color: 0x22c55e })).translateX(0.2).translateZ(0.27), new T.Mesh(new T.SphereGeometry(0.03, 8, 6), new T.MeshBasicMaterial({ color: 0xef4444 })).translateX(-0.2).translateZ(0.27));
    drone.scale.setScalar(2);
    const pathPts = [];
    const lineY = (k) => 60 - LINE_GAP / 2 - LINE_GAP * k;      // top line first
    for (let k = 0; k < LINES; k++) { const l = k % 2 === 0 ? -15 : 15; pathPts.push(new T.Vector3(l, lineY(k), STANDOFF), new T.Vector3(-l, lineY(k), STANDOFF)); }
    const PATH_LEN = LINES * 30 + (LINES - 1) * LINE_GAP;
    const path = lineOf(pathPts, 0x38bdf8, false, 0.5); bld.add(path);
    const covered = new T.Mesh(new T.PlaneGeometry(1, 1), B(0x38bdf8, 0.16)); bld.add(covered);
    const foot = new T.Mesh(new T.PlaneGeometry(FOOT_W, FOOT_H), B(0xf59e0b, 0.22)); bld.add(foot);
    const footEdge = lineOf([new T.Vector3(-FOOT_W / 2, -FOOT_H / 2, 0), new T.Vector3(FOOT_W / 2, -FOOT_H / 2, 0), new T.Vector3(FOOT_W / 2, FOOT_H / 2, 0), new T.Vector3(-FOOT_W / 2, FOOT_H / 2, 0)], 0xf59e0b, false, 1, true); bld.add(footEdge);
    const frGeo = new T.BufferGeometry(); frGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(24), 3));
    const frustum = new T.LineSegments(frGeo, new T.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 })); bld.add(frustum);
    const standoffGeo = new T.BufferGeometry(); standoffGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
    const standoffLine = new T.Line(standoffGeo, new T.LineBasicMaterial({ color: 0x22d3ee })); bld.add(standoffLine);
    const dronePos = new T.Vector3(-12, 0.95, 15);
    addLabel('building', '#f59e0b', () => tmpA.copy(dronePos).setY(dronePos.y + 2.4), () => state.mission === 'survey'
      ? 'Drone: image ' + Math.min(IMAGES_FRONT, Math.round(state.surveyT * IMAGES_FRONT)) + ' of ' + IMAGES_FRONT + ' on this elevation'
      : 'Drone landed (survey done)', () => state.mission !== 'manual');
    addLabel('building', '#22d3ee', () => tmpA.set(dronePos.x, dronePos.y - 1.6, STANDOFF / 2), () => '15 m standoff: 1.32 mm per pixel', () => state.mission === 'survey');

    // ground station, cordon, people
    const gcs = new T.Group(); gcs.position.set(-13, 0, 15); bld.add(gcs);
    [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]].forEach(([x, z]) => gcs.add(cylY(0.04, 2.4, steel, 6).translateX(x).translateY(1.2).translateZ(z)));
    gcs.add(box(3.5, 0.1, 2.7, M(0x1d4ed8, 0.8, 0), 0, 2.45, 0), box(2.2, 0.06, 0.8, M(0xd1d5db, 0.6, 0.1), 0, 0.85, -0.3));
    gcs.add(box(0.7, 0.45, 0.04, new T.MeshBasicMaterial({ color: 0x0ea5e9 }), -0.5, 1.15, -0.5), box(0.7, 0.45, 0.04, new T.MeshBasicMaterial({ color: 0x10b981 }), 0.5, 1.15, -0.5));
    const pPilot = person(0x2563eb), pOp = person(0x0891b2), pCP = person(0xf8fafc); pPilot.position.set(-0.6, 0, 0.4); pOp.position.set(0.5, 0, 0.4); pCP.position.set(1.5, 0, 0.9); gcs.add(pPilot, pOp, pCP);
    const obs = person(0x22c55e); obs.position.set(4, 0.06, 19); bld.add(obs);
    const pad = new T.Mesh(new T.CircleGeometry(1.3, 24).rotateX(-Math.PI / 2), B(0xf59e0b, 0.6)); pad.position.set(-8.5, 0.08, 15); bld.add(pad);
    addLabel('building', '#10b981', () => tmpA.set(-13, 3.6, 15), () => 'Ground station: pilot, robot operator, CP');
    const cordon = new T.Group(); bld.add(cordon);
    const cz0 = 0.6, cz1 = 9, cx = 17, postMat = M(0xf97316, 0.7, 0), tapeP = [];
    const ring = []; for (let x = -cx; x <= cx; x += 3.4) ring.push([x, cz1]); for (let z = cz1 - 2.8; z >= cz0; z -= 2.8) ring.push([cx, z]);
    const ringL = []; for (let z = cz1 - 2.8; z >= cz0; z -= 2.8) ringL.push([-cx, z]);
    ringL.reverse().concat(ring).forEach(([x, z], i, arr) => { cordon.add(cylY(0.06, 1.0, postMat, 8).translateX(x).translateY(0.5).translateZ(z)); tapeP.push(new T.Vector3(x, 0.92, z)); });
    cordon.add(lineOf(tapeP, 0xf59e0b));
    const tape2 = lineOf(tapeP.map((p) => p.clone().setY(0.6)), 0xf59e0b); cordon.add(tape2);
    addLabel('building', '#f97316', () => tmpA.set(8, 1.8, 9), () => 'Cordoned drop zone');
    [[23, 13, 0x64748b], [26, 17, 0xa855f7], [-24, 21, 0x64748b]].forEach(([x, z, c]) => { const p = person(c); p.position.set(x, 0.06, z); bld.add(p); });

    /* ---------- theme ---------- */
    let themeLight = null;
    function applyTheme() {
      const light = document.documentElement.classList.contains('light');
      if (light === themeLight) return; themeLight = light;
      scene.background = new T.Color(light ? 0xdde6f0 : 0x0a1220);
      hemi.intensity = light ? 1.25 : 1.1; hemi.groundColor.set(light ? 0x8a94a3 : 0x2a3446);
      sun.intensity = light ? 2.3 : 1.9; fill.intensity = light ? 0.35 : 0.5;
      wallMat.color.set(light ? 0xffffff : 0xa9b6c8);
      groundMat.color.set(light ? 0x8fa287 : 0x2b3a35); paveMat.color.set(light ? 0xc9cfd6 : 0x4b5563);
      frontMat.color.set(light ? 0xffffff : 0xb6bfcc); sideMat.color.set(light ? 0xffffff : 0xb6bfcc);
    }

    /* ---------- per-frame update ---------- */
    const vA = new T.Vector3(), vB = new T.Vector3();
    let lastW = 0, lastH = 0, shadowMode = '';
    function render(dt) {
      const w = Math.max(50, canvas.clientWidth), h = Math.max(50, canvas.clientHeight);
      if (w !== lastW || h !== lastH) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); lastW = w; lastH = h; }
      applyTheme();
      const isB = state.scene === 'building';
      close.visible = !isB; bld.visible = isB;
      const tele = api.telemetry();

      // camera
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      camera.position.set(cam.tx + cam.dist * cp * Math.sin(cam.yaw), cam.ty + cam.dist * sp, cam.tz + cam.dist * cp * Math.cos(cam.yaw));
      camera.lookAt(cam.tx, cam.ty, cam.tz);
      camera.near = isB ? 0.5 : 0.03; camera.far = isB ? 900 : 60; camera.updateProjectionMatrix();
      if (shadowMode !== state.scene) {
        shadowMode = state.scene; const r = isB ? 80 : 2.4, sc = sun.shadow.camera;
        sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = isB ? 10 : 0.5; sc.far = isB ? 320 : 14; sc.updateProjectionMatrix();
        if (isB) { sun.position.set(55, 120, 95); sun.target.position.set(0, 26, 0); fill.position.set(-60, 40, 30); }
        else { sun.position.set(2.2, 3.4, 4.2); sun.target.position.set(0, 0, 0); fill.position.set(-3, 1, 2); }
      }

      // platform placement
      fz += ((state.bumperContact ? FZ_CONTACT : FZ_FREE) - fz) * Math.min(1, dt * 9);
      const robX = isB ? STRIP_X[Math.max(0, Math.min(3, state.dropIdx | 0))] : 0, robY = isB ? state.elevY : 0;
      const parent = isB ? bld : close;
      if (plat.parent !== parent) parent.add(plat);
      plat.position.set(robX, robY, fz);
      plat.visible = !(isB && state.mission === 'manual');
      padMats.forEach((m) => m.color.set(state.bumperContact ? 0x10b981 : 0xf59e0b));
      led.material.color.set(state.faultMessage ? 0xef4444 : 0x10b981);

      // arm
      g1.rotation.z = 0; l1.rotation.z = state.theta1; g2.rotation.z = state.theta2; gw.rotation.z = -(state.theta1 + state.theta2);
      const d3 = state.d3_mm / 1000;
      j3rod.scale.z = Math.max(0.001, d3 + 0.02); j3rod.position.z = SLIDE_END - (d3 + 0.02) / 2 + 0.01;
      tool.position.z = SLIDE_END - d3;
      hammer.position.z = -0.062 - (state.hammerImpulseN > 1 ? 0.012 : 0);
      shroudMat.color.set(state.shroudPreloadN >= 9 ? 0x10b981 : 0xf59e0b);
      fov.visible = state.showFov;
      if (state.showFov) {
        const p = fovGeo.attributes.position.array, zc = -0.095, zw = -fz + 0.006, s = 0.075;
        const c = [[-s, -s], [s, -s], [s, s], [-s, s]]; let o = 0;
        for (let i = 0; i < 4; i++) { p[o++] = 0; p[o++] = 0.066; p[o++] = zc; p[o++] = c[i][0]; p[o++] = c[i][1]; p[o++] = zw; }
        for (let i = 0; i < 4; i++) { const n = c[(i + 1) % 4]; p[o++] = c[i][0]; p[o++] = c[i][1]; p[o++] = zw; p[o++] = n[0]; p[o++] = n[1]; p[o++] = zw; }
        fovGeo.attributes.position.needsUpdate = true; fov.material.color.set(state.faults.cam ? 0xef4444 : 0x38bdf8);
      }

      // fans
      fans.forEach((f, fi) => {
        f.spin += dt * (6 + 60 * state.fanFraction) * (fi ? -1 : 1); f.rotor.rotation.z = f.spin;
        f.shMat.color.set(state.faults.fan && fi === 1 ? 0xef4444 : 0x334155);
        const on = state.fanFraction > 0.3 && !(state.faults.fan && fi === 1);
        f.streaks.forEach((s, i) => {
          const p = state.particles[(i * 2 + fi) % state.particles.length];
          s.visible = on; if (!on) return;
          s.position.set(p.jitterX * 1.6, p.jitterY * 1.6, 0.09 + p.phase * 0.38); s.material.opacity = (1 - p.phase) * 0.7;
        });
      });

      if (!isB) {
        // tiles
        tiles.forEach((t, i) => {
          const o = tileMeshes[i];
          if (t.result) { o.m.material.color.set(RESULT_COL[t.result]); o.m.material.opacity = 0.62; }
          else { o.m.material.color.set(0xffffff); o.m.material.opacity = 0.05; }
          o.crack.visible = t.truth === 'CRACKED'; o.dot.visible = !t.result;
        });
        const st = tiles[state.selectedTileIdx]; selRing.position.x = st.x; selRing.position.y = st.y;
        ringOuter.visible = ringInner.visible = state.showWorkspace;
        ripple.visible = state.strikePulse > 0;
        if (ripple.visible) { const r = 0.03 + (1 - state.strikePulse) * 0.13; ripple.scale.set(r, r, 1); ripple.position.x = state.strikeX; ripple.position.y = state.strikeY; ripple.material.color.set(state.strikeColor); ripple.material.opacity = state.strikePulse; }
        const rm = state.faults.wire ? ropeBad : ropeMat; cRopeL.material = rm;
        setRod(cRopeL, vA.set(-0.38, 0.49, fz), vB.set(-0.46, 3.2, fz - 0.02));
        setRod(cRopeR, vA.set(0.38, 0.49, fz), vB.set(0.46, 3.2, fz - 0.02));
        setRod(cUmb, vA.set(-0.08, 0.5, fz + 0.02), vB.set(-0.06, 3.2, fz + 0.04));
        const side = state.scene === 'side';
        arrThrust.visible = arrWind.visible = side;
        if (side) {
          arrThrust.position.set(0, -0.6, fz + 0.5); arrThrust.setLength(Math.max(0.08, tele.fanPreloadN / 260), 0.07, 0.045);
          arrWind.position.set(0, 0.55, fz + 0.1); arrWind.setLength(Math.max(0.08, tele.windDragN / 260), 0.07, 0.045);
        }
      } else {
        const manual = state.mission === 'manual', survey = state.mission === 'survey', tapping = state.mission === 'tapping';
        carrier.visible = !manual; bRopeL.visible = bRopeR.visible = bUmb.visible = !manual;
        carrier.position.x = robX;
        drums.forEach((d, i) => { d.rotation.x = state.elevY * 1.6 * (i ? 1 : -1); });
        const rm = state.faults.wire ? ropeBad : ropeMat; bRopeL.material = rm;
        setRod(bRopeL, vA.set(robX - 0.47, 61.25, 0.55), vB.set(robX - 0.38, robY + 0.49, fz));
        setRod(bRopeR, vA.set(robX + 0.47, 61.25, 0.55), vB.set(robX + 0.38, robY + 0.49, fz));
        setRod(bUmb, vA.set(robX - 0.08, 61.2, 0.62), vB.set(robX - 0.08, robY + 0.5, fz + 0.02));

        // tapped stances
        strips.visible = !manual; stances.visible = tapping;
        if (tapping) {
          let n = 0; const active = Math.max(0, Math.min(3, state.dropIdx | 0));
          for (let s = 0; s <= active; s++) for (let i = 0; i < STANCES_PER_DROP; i++) {
            const y = 60 - 0.4 - 0.8 * i; if (y < 3.4) break;
            if (s === active && y < robY + 0.5) break;
            dummy.position.set(STRIP_X[s], y, 0.04); dummy.updateMatrix(); stances.setMatrixAt(n, dummy.matrix);
            stances.setColorAt(n, ((i * 7 + s * 13) % 23 === 4 || (i + s * 5) % 31 === 9) ? colR : colG); n++;
          }
          stances.count = n; stances.instanceMatrix.needsUpdate = true; if (stances.instanceColor) stances.instanceColor.needsUpdate = true;
        }

        // gondola
        gondola.visible = davits.visible = gRopeL.visible = gRopeR.visible = manual;
        if (manual) {
          const gy = 32 + Math.sin(state.droneAngle * 0.3) * 5;
          gondola.position.set(-3, gy, 0.55); davits.position.x = -3;
          setRod(gRopeL, vA.set(-4, 61.3, 0.65), vB.set(-4, gy + 1.05, 0.55)); setRod(gRopeR, vA.set(-2, 61.3, 0.65), vB.set(-2, gy + 1.05, 0.55));
        }

        // drone
        drone.visible = !manual; path.visible = covered.visible = foot.visible = footEdge.visible = frustum.visible = standoffLine.visible = survey;
        props.forEach((p, i) => { p.rotation.y += dt * (survey ? 55 : 0) * (i % 2 ? 1 : -1); });
        if (survey) {
          let d = Math.max(0, Math.min(1, state.surveyT)) * PATH_LEN, k = 0;
          while (k < LINES - 1 && d > 30 + LINE_GAP) { d -= 30 + LINE_GAP; k++; }
          const dir = k % 2 === 0 ? 1 : -1; let x, y;
          if (d <= 30) { x = -15 * dir + d * dir; y = lineY(k); } else { x = 15 * dir; y = lineY(k) - (d - 30); }
          dronePos.set(x, y + Math.sin(state.droneAngle * 3) * 0.05, STANDOFF);
          drone.rotation.z = -dir * 0.05 * (d <= 30 ? 1 : 0);
          foot.position.set(x, y, 0.08); footEdge.position.set(x, y, 0.09);
          const p = frGeo.attributes.position.array, cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; let o = 0;
          cs.forEach(([a, b]) => { p[o++] = x; p[o++] = y - 0.4; p[o++] = STANDOFF - 0.5; p[o++] = x + a * FOOT_W / 2; p[o++] = y + b * FOOT_H / 2; p[o++] = 0.1; });
          frGeo.attributes.position.needsUpdate = true;
          const sp2 = standoffGeo.attributes.position.array; sp2[0] = x; sp2[1] = y - 0.9; sp2[2] = STANDOFF - 0.6; sp2[3] = x; sp2[4] = y - 0.9; sp2[5] = 0.1; standoffGeo.attributes.position.needsUpdate = true;
          const top = 60, bot = Math.max(3, y + FOOT_H / 2); const ch = Math.max(0.01, top - bot);
          covered.scale.set(30, ch, 1); covered.position.set(0, bot + ch / 2, 0.05);
          flagMeshes.forEach((m) => { m.visible = m.position.y > y; });
        } else {
          dronePos.set(-8.5, 0.98, 15); drone.rotation.z = 0;
          flagMeshes.forEach((m) => { m.visible = tapping; });
        }
        drone.position.copy(dronePos);
        cordon.visible = true;
      }

      renderer.render(scene, camera);

      // labels
      const show = state.showLabels !== false, placed = [];
      for (const L of labels) {
        let on = show && (L.group === 'both' || (L.group === 'building') === isB) && (!L.when || L.when());
        if (L.group === 'both' && isB) on = false;
        let x = 0, y = 0;
        if (on) { const p = L.posFn(); vA.copy(p).project(camera); on = vA.z < 1 && vA.z > -1 && Math.abs(vA.x) < 1.05 && Math.abs(vA.y) < 1.05; x = (vA.x * 0.5 + 0.5) * w; y = (-vA.y * 0.5 + 0.5) * h; }
        if (on !== L.on) { L.el.style.display = on ? '' : 'none'; L.on = on; }
        if (!on) continue;
        const txt = L.textFn(); if (txt !== L.last) { L.span.textContent = txt; L.last = txt; L.w = L.el.offsetWidth; }
        const hw = (L.w || 120) / 2; x = Math.max(hw + 4, Math.min(w - hw - 4, x)); y = Math.max(14, Math.min(h - 14, y));
        for (let pass = 0; pass < 6; pass++) { let hit = false; for (const q of placed) if (Math.abs(q.x - x) < q.hw + hw + 6 && Math.abs(q.y - y) < 22) { y = q.y + 23; hit = true; } if (!hit) break; }
        placed.push({ x, y, hw });
        L.el.style.transform = 'translate(' + (x - hw).toFixed(1) + 'px,' + (y - 10).toFixed(1) + 'px)';
      }
    }

    return { render, images: IMAGES_FRONT, strips: STRIP_X.length };
  }

  window.TwinScene = { create };
})();

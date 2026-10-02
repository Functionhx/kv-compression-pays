// Explainer video for "When Does KV Cache Compression Pay?" — 1920×1080, deterministic: VIDEO.seek(t) draws frame t.
// All numbers are taken from the paper.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const root = document.getElementById("root");

  // ── palette (matches the project page, light theme) ────────────────────
  const C = {
    page: "#f9f9f7", surface: "#fcfcfb", surface2: "#f3f2ee", ink: "#0b0b0b", ink2: "#52514e", muted: "#898781",
    grid: "#e1e0d9", axis: "#c3c2b7", border: "rgba(11,11,11,0.10)",
    blue: "#2a78d6", wash: "rgba(42,120,214,0.10)", ord1: "#86b6ef", ord3: "#104281",
    fp16: "#a8a7a0", good: "#006300", goodFill: "rgba(12,163,12,0.10)", bad: "#d03b3b", badFill: "rgba(208,59,59,0.09)",
  };

  // ── helpers ──────────────────────────────────────────────────────────
  function E(tag, a = {}, p) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(a)) if (v != null) n.setAttribute(k, v);
    if (p) p.appendChild(n);
    return n;
  }
  function T(p, x, y, str, o = {}) {
    const n = E("text", {
      x, y, "text-anchor": o.anchor || "start", "font-size": o.size || 28, "font-weight": o.weight || 400,
      fill: o.fill || C.ink, opacity: o.op ?? 1, "font-style": o.italic ? "italic" : null,
      "font-variant-numeric": o.tab ? "tabular-nums" : null, "letter-spacing": o.ls || null,
    }, p);
    n.textContent = str;
    return n;
  }
  const R = (p, x, y, w, h, o = {}) => E("rect", { x, y, width: Math.max(w, 0), height: Math.max(h, 0), rx: o.rx ?? 12, fill: o.fill || C.surface2, stroke: o.stroke || null, "stroke-width": o.sw || null, opacity: o.op ?? 1 }, p);
  const L = (p, x1, y1, x2, y2, o = {}) => E("line", { x1, y1, x2, y2, stroke: o.stroke || C.axis, "stroke-width": o.sw || 2, opacity: o.op ?? 1, "stroke-linecap": "round" }, p);
  const G = (p, op = 1, tr) => E("g", { opacity: op, transform: tr || null }, p);
  const clamp = (v) => Math.min(Math.max(v, 0), 1);
  const ease = (p) => { p = clamp(p); return p * p * (3 - 2 * p); };
  const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
  const lerp = (a, b, p) => a + (b - a) * clamp(p);
  const fin = (lt, start, dur = 0.5) => ease((lt - start) / dur);
  // pill: text with a rounded background sized to the text
  function pill(p, x, y, str, o = {}) {
    const g = G(p, o.op ?? 1);
    const t = T(g, x, y, str, { size: o.size || 24, weight: o.weight || 600, fill: o.fill || C.ink, anchor: o.anchor || "middle" });
    const b = t.getBBox();
    const px = o.px ?? 18, py = o.py ?? 10;
    const r = R(g, b.x - px, b.y - py, b.width + 2 * px, b.height + 2 * py, { rx: (b.height + 2 * py) / 2, fill: o.bg || C.surface, stroke: o.stroke || C.border, sw: o.sw || 1.5 });
    g.insertBefore(r, t);
    return g;
  }
  function title(p, lt, str, sub) {
    T(p, 960, 128, str, { size: 54, weight: 700, anchor: "middle", op: fin(lt, 0.1, 0.5) });
    if (sub) T(p, 960, 180, sub, { size: 28, weight: 600, anchor: "middle", fill: C.blue, op: fin(lt, 0.3, 0.5) });
  }
  function caption(p, lt, start, lines) {
    const op = fin(lt, start, 0.5);
    [].concat(lines).forEach((s, i, a) => T(p, 960, 968 - (a.length - 1 - i) * 42, s, { size: 30, anchor: "middle", fill: C.ink2, op }));
  }
  function worker(p, x, y, w, h, name, sub, gpus = 2) {
    R(p, x, y, w, h, { rx: 22, fill: C.surface2, stroke: C.border, sw: 1.5 });
    T(p, x + w / 2, y + 48, name, { size: 28, weight: 700, anchor: "middle" });
    if (sub) T(p, x + w / 2, y + 80, sub, { size: 21, anchor: "middle", fill: C.muted });
    const gw = 76, gap = 14, tot = gpus * gw + (gpus - 1) * gap;
    for (let i = 0; i < gpus; i++) {
      const gx = x + (w - tot) / 2 + i * (gw + gap);
      R(p, gx, y + h - 140, gw, 96, { rx: 12, fill: C.surface, stroke: C.axis, sw: 1.5 });
      T(p, gx + gw / 2, y + h - 84, "GPU", { size: 20, weight: 600, anchor: "middle", fill: C.ink2 });
    }
  }
  function seeded(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

  // ── scenes ───────────────────────────────────────────────────────────
  const scenes = [];
  const add = (dur, draw) => scenes.push({ dur, draw });

  // 0 · title card
  add(4.6, (g, lt) => {
    pill(g, 960, 372, "GPC 2026 · Cloud Computing Track", { size: 26, fill: C.blue, bg: C.wash, stroke: "none", op: fin(lt, 0.2) });
    T(g, 960, 500, "When Does KV Cache Compression Pay?", { size: 86, weight: 750, anchor: "middle", op: fin(lt, 0.5, 0.7), ls: "-1" });
    T(g, 960, 572, "A Quality- and Cost-Aware Runtime Framework for Cloud LLM Serving", { size: 36, anchor: "middle", fill: C.ink2, op: fin(lt, 0.9, 0.7) });
    T(g, 960, 680, "Yuchen Fan  ·  Beijing Institute of Technology", { size: 30, weight: 600, anchor: "middle", fill: C.ink, op: fin(lt, 1.4, 0.7) });
  });

  // 1 · disaggregated serving
  add(8.5, (g, lt) => {
    title(g, lt, "Disaggregated LLM serving");
    const cl = (x, name) => {
      R(g, x, 250, 450, 560, { rx: 26, fill: "none", stroke: C.axis, sw: 2 });
      T(g, x + 225, 296, name, { size: 30, weight: 700, anchor: "middle" });
      [330, 570].forEach((ny, i) => {
        R(g, x + 30, ny, 390, 210, { rx: 18, fill: C.surface2, stroke: C.border, sw: 1.5 });
        T(g, x + 52, ny + 40, `node ${i + 1}`, { size: 21, weight: 600, fill: C.muted });
        for (let k = 0; k < 4; k++) {
          R(g, x + 52 + k * 88, ny + 72, 74, 96, { rx: 12, fill: C.surface, stroke: C.axis, sw: 1.5 });
          T(g, x + 89 + k * 88, ny + 128, "GPU", { size: 19, weight: 600, anchor: "middle", fill: C.ink2 });
        }
      });
    };
    const gc = G(g, fin(lt, 0.4, 0.6));
    cl(130, "Prefill cluster");
    cl(1340, "Decode cluster");
    // network links
    const links = [435, 675];
    links.forEach((y) => L(gc, 600, y, 1320, y, { sw: 3 }));
    T(gc, 960, 568, "network", { size: 24, anchor: "middle", fill: C.muted });
    // incoming requests
    for (let i = 0; i < 6; i++) {
      const p = ((lt - 0.8) / 1.6 + i / 6) % 1;
      if (lt < 0.8) continue;
      const y = 400 + (i % 3) * 120;
      E("circle", { cx: lerp(30, 150, p), cy: y, r: 9, fill: C.ink2, opacity: Math.min(1, p * 6, (1 - p) * 6) * fin(lt, 0.8) }, g);
    }
    // KV blocks crossing the network
    links.forEach((y, li) => {
      for (let i = 0; i < 6; i++) {
        if (lt < 1.6) break;
        const p = ((lt - 1.6) / 2.6 + i / 6 + li * 0.08) % 1;
        R(g, lerp(608, 1284, p), y - 16, 32, 32, { rx: 6, fill: C.fp16, op: Math.min(1, p * 8, (1 - p) * 8) * fin(lt, 1.6) });
      }
    });
    R(g, 820, 740, 26, 26, { rx: 5, fill: C.fp16, op: fin(lt, 2.0) });
    T(g, 858, 761, "KV cache block", { size: 22, fill: C.ink2, op: fin(lt, 2.0) });
    caption(g, lt, 2.4, ["Prefill and decode run on different GPUs.", "Every request’s KV cache has to cross the network."]);
  });

  // 2 · promise vs fixed costs
  add(11, (g, lt) => {
    const A = 1 - fin(lt, 5.0, 0.5), B = fin(lt, 5.5, 0.6);
    const ga = G(g, A), gb = G(g, B);
    if (A > 0) {
      title(ga, lt, "The promise: fewer bytes, faster transfers?");
      // fp16 chunk → compressed chunk
      const cols = 8, rows = 6, cell = 40, gap = 6;
      const s = lerp(1, 1 / Math.sqrt(2.55), easeOut((lt - 1.2) / 1.2));
      const x0 = lerp(330, 1060, easeOut((lt - 1.2) / 1.2)), y0 = 540 - (rows * (cell + gap) * s) / 2;
      // the original fp16 chunk stays on the left; a compressed copy moves right and shrinks
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        R(ga, 330 + c * (cell + gap), 540 - rows * (cell + gap) / 2 + r * (cell + gap), cell, cell, { rx: 5, fill: C.fp16 });
      if (lt > 1.2) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        R(ga, x0 + c * (cell + gap) * s, y0 + r * (cell + gap) * s, cell * s, cell * s, { rx: 5 * s, fill: lt > 1.6 ? C.blue : C.fp16 });
      T(ga, 330 + cols * (cell + gap) / 2, 720, "fp16 KV chunk", { size: 26, weight: 600, anchor: "middle", fill: C.ink2, op: fin(lt, 0.4) });
      T(ga, 1060 + cols * (cell + gap) / 2 / Math.sqrt(2.55), 720, "compressed: 2.55× fewer bytes", { size: 26, weight: 600, anchor: "middle", fill: C.ink2, op: fin(lt, 2.2) });
      T(ga, 1560, 556, "2.55× faster?", { size: 64, weight: 750, anchor: "middle", fill: C.blue, op: fin(lt, 3.0, 0.6) });
    }
    if (B > 0) {
      const lb = lt - 5.5;
      T(gb, 960, 128, "The catch: fixed costs that byte counts ignore", { size: 54, weight: 700, anchor: "middle" });
      const boxes = [
        { x: 90, w: 250, t: "Prefill GPU", s: "" },
        { x: 410, w: 300, t: "Encode", s: "pre-pass · select · pack", fixed: true },
        { x: 780, w: 360, t: "Network link", s: "payload + scales + mode bytes" },
        { x: 1210, w: 300, t: "Decode", s: "unpack · dequantize", fixed: true },
        { x: 1580, w: 250, t: "Decode GPU", s: "" },
      ];
      boxes.forEach((b, i) => {
        const op = fin(lb, 0.2 + i * 0.25);
        const gg = G(gb, op);
        R(gg, b.x, 400, b.w, 150, { rx: 18, fill: b.fixed ? C.wash : C.surface2, stroke: b.fixed ? C.blue : C.border, sw: b.fixed ? 2.5 : 1.5 });
        T(gg, b.x + b.w / 2, b.s ? 466 : 484, b.t, { size: 30, weight: 700, anchor: "middle" });
        if (b.s) T(gg, b.x + b.w / 2, 506, b.s, { size: 21, anchor: "middle", fill: C.muted });
        if (b.fixed) pill(gg, b.x + b.w / 2, 616, "fixed cost", { size: 21, fill: C.blue, bg: C.surface, stroke: C.blue, op: fin(lb, 1.6) });
        if (i < boxes.length - 1) T(gg, b.x + b.w + 35, 488, "→", { size: 38, anchor: "middle", fill: C.muted });
      });
      // T_path = α_codec + β_link · bytes + T_consumer
      const eq = E("text", { x: 960, y: 770, "text-anchor": "middle", "font-size": 44, fill: C.ink, opacity: fin(lb, 2.2, 0.6) }, gb);
      const parts = [["T", null], ["path", "sub"], [" = ", null], ["α", "hl"], ["codec", "subhl"], [" + β", null], ["link", "sub"], [" · bytes + T", null], ["consumer", "sub"]];
      let down = false;
      for (const [s, k] of parts) {
        const sub = !!k && k.startsWith("sub");
        const ts = E("tspan", { dy: sub && !down ? 10 : !sub && down ? -10 : null, "font-size": sub ? 26 : null }, eq);
        ts.textContent = s;
        down = sub;
        if (k === "hl" || k === "subhl") { ts.setAttribute("fill", C.blue); ts.setAttribute("font-weight", 700); }
      }
      caption(gb, lb, 2.8, "Encoding, metadata, and decoding cost time no matter how small the chunk is.");
    }
  });

  // 3 · races (timing to scale within each race)
  const RACE_FP16 = 3.5;
  function raceScene(row, head) {
    const k = RACE_FP16 / row.fp16;
    const r = { codec: row.codec * k, xfer: row.xfer * k, fp16: RACE_FP16 };
    r.cert = r.codec + r.xfer;
    const INTRO = 0.9, HOLD = 2.4;
    add(INTRO + Math.max(r.fp16, r.cert) + HOLD, (g, lt) => {
      title(g, lt, head, `${row.mb} MB of fp16 KV  ·  ${row.tokens}-token prefill`);
      worker(g, 90, 300, 270, 470, "Prefill", "worker");
      worker(g, 1560, 300, 270, 470, "Decode", "worker");
      const X0 = 380, X1 = 1540, lf = 470, lc = 640;
      L(g, X0, lf, X1, lf, { sw: 3 });
      L(g, X0, lc, X1, lc, { sw: 3 });
      T(g, X0 + 10, lf - 40, "fp16 · no codec", { size: 28, weight: 650, fill: C.ink2 });
      T(g, X0 + 10, lc - 48, "certified B=0.2 · 2.55× fewer bytes", { size: 28, weight: 650, fill: C.ink2 });
      const rt = lt - INTRO;
      const fWin = r.fp16 < r.cert;
      // encode booth
      const inCodec = rt < r.codec, cp = clamp(rt / r.codec);
      R(g, X0 + 6, lc - 36, 150, 72, { rx: 16, fill: C.wash, stroke: inCodec && rt > 0 ? C.blue : C.ord1, sw: inCodec && rt > 0 ? 3 : 2 });
      R(g, X0 + 22, lc + 22, 118 * cp, 6, { rx: 3, fill: C.blue });
      T(g, X0 + 81, lc + 70, `encode ${row.codec} ms`, { size: 22, anchor: "middle", fill: C.muted });
      // packets
      const fw = 120, cw = 120 / 2.55;
      R(g, lerp(X0 + 6, X1 - fw - 6, rt / r.fp16), lf - 22, fw, 44, { rx: 9, fill: C.fp16 });
      const w = lerp(fw, cw, ease(cp));
      const cx = inCodec ? X0 + 81 - w / 2 : lerp(X0 + 81 - cw / 2, X1 - cw - 6, (rt - r.codec) / r.xfer);
      R(g, cx, lc - 22, w, 44, { rx: 9, fill: C.blue });
      // timers
      const tm = (end, real) => `${((clamp(rt / end)) * real).toFixed(2)} ms`;
      const fDone = rt >= r.fp16, cDone = rt >= r.cert;
      T(g, X1 - 6, lf - 40, tm(r.fp16, row.fp16) + (fDone && fWin ? "  ✓ first" : fDone ? "  ✓" : ""), { size: 30, weight: 700, anchor: "end", fill: fDone && fWin ? C.good : C.ink2, tab: true });
      T(g, X1 - 6, lc - 48, tm(r.cert, row.codec + row.xfer) + (cDone && !fWin ? "  ✓ first" : cDone ? "  ✓" : ""), { size: 30, weight: 700, anchor: "end", fill: cDone && !fWin ? C.good : C.ink2, tab: true });
      T(g, 1840, 1040, "timing to scale", { size: 20, anchor: "end", fill: C.muted });
      const done = rt >= Math.max(r.fp16, r.cert);
      if (done) caption(g, rt - Math.max(r.fp16, r.cert), 0.1, fWin
        ? `fp16 arrives first: ${row.fp16} ms vs ${row.codec} + ${row.xfer} = ${(row.codec + row.xfer).toFixed(2)} ms.`
        : `Compression pays: ${(row.codec + row.xfer).toFixed(2)} ms vs ${row.fp16} ms for fp16.`);
      else caption(g, lt, 0.4, "Same chunk, two paths: send fp16 as is, or encode first and send fewer bytes.");
    });
  }
  raceScene({ mb: 23, tokens: 1024, fp16: 0.89, codec: 0.57, xfer: 0.39 }, "Small chunk: fewer bytes, but slower");
  raceScene({ mb: 92, tokens: 4096, fp16: 3.51, codec: 1.02, xfer: 1.42 }, "Large chunk: now compression pays");

  // 3c · crossover depends on the link
  add(8, (g, lt) => {
    title(g, lt, "The crossover depends on the link");
    const x0 = 520, x1 = 1760, lo = 64, hi = 131072;
    const sx = (kb) => x0 + ((x1 - x0) * Math.log(kb / lo)) / Math.log(hi / lo);
    R(g, sx(256), 300, sx(4096) - sx(256), 520, { rx: 14, fill: "rgba(42,120,214,0.06)", op: fin(lt, 0.4) });
    T(g, (sx(256) + sx(4096)) / 2, 290, "typical disaggregated chunk sizes", { size: 21, anchor: "middle", fill: C.muted, op: fin(lt, 0.4) });
    [[64, "64 KB"], [256, "256 KB"], [1024, "1 MB"], [4096, "4 MB"], [16384, "16 MB"], [65536, "64 MB"]].forEach(([v, s]) => {
      L(g, sx(v), 320, sx(v), 800, { stroke: C.grid, sw: 1.5, op: fin(lt, 0.3) });
      T(g, sx(v), 846, s, { size: 22, anchor: "middle", fill: C.muted, op: fin(lt, 0.3) });
    });
    const rows = [
      { name: "Same-GPU", y: 390, segs: [[64, 16384, "f"]], label: [16384, "never pays"] },
      { name: "PCIe", y: 560, segs: [[64, 1056, "f"], [1056, 2081, "x"], [2081, 16384, "c"]], label: [1480, "1.06–2.08 MB"] },
      { name: "Dual-GPU P2P", y: 730, segs: [[11500, 23000, "f"], [23000, 46000, "x"], [46000, 92000, "c"]], label: [32500, "23–46 MB"] },
    ];
    rows.forEach((row, i) => {
      const st = 0.8 + i * 1.1;
      T(g, x0 - 24, row.y + 12, row.name, { size: 30, weight: 650, anchor: "end", op: fin(lt, st, 0.4) });
      const grow = easeOut((lt - st) / 1.2);
      const xa = sx(row.segs[0][0]), xb = sx(row.segs[row.segs.length - 1][1]);
      const lim = lerp(xa, xb, grow);
      row.segs.forEach(([a, b, k]) => {
        const sa = sx(a) + 2, sb = Math.min(sx(b) - 2, lim);
        if (sb <= sa) return;
        R(g, sa, row.y - 22, sb - sa, 44, { rx: 8, fill: k === "f" ? C.fp16 : k === "c" ? C.blue : "url(#hatch)" });
      });
      const [lv, ls] = row.label;
      const lx = row.name === "Same-GPU" ? sx(lv) + 18 : sx(lv);
      T(g, lx, row.name === "Same-GPU" ? row.y + 11 : row.y - 38, ls, { size: 28, weight: 700, anchor: row.name === "Same-GPU" ? "start" : "middle", fill: C.ink, op: fin(lt, st + 1.1) });
    });
    // legend
    const lg = G(g, fin(lt, 3.6));
    [[C.fp16, "fp16 faster"], ["url(#hatch)", "crossover"], [C.blue, "compressed faster"]].forEach(([f, s], i) => {
      R(lg, 640 + i * 260, 884, 26, 26, { rx: 6, fill: f });
      T(lg, 678 + i * 260, 905, s, { size: 22, fill: C.ink2 });
    });
    caption(g, lt, 4.2, "Same idea, different links, very different answers.");
  });

  // 4 · quality
  add(13, (g, lt) => {
    title(g, lt, "Fewer bytes are not automatically safe either");
    T(g, 120, 300, "Worst-case per-block KV magnitude m*", { size: 28, weight: 650, fill: C.ink2, op: fin(lt, 0.5) });
    const mags = [["OPT-125M", 9.8], ["TinyLlama-1.1B", 21.9], ["Qwen2.5-3B", 92.8], ["Qwen2.5-7B", 419]];
    const bx0 = 360, bx1 = 960, sx = (v) => bx0 + ((bx1 - bx0) * Math.log10(v)) / 3;
    [1, 10, 100, 1000].forEach((v) => {
      L(g, sx(v), 350, sx(v), 740, { stroke: v === 1 ? C.axis : C.grid, sw: 1.5, op: fin(lt, 0.5) });
      T(g, sx(v), 776, v.toLocaleString("en-US"), { size: 21, anchor: "middle", fill: C.muted, op: fin(lt, 0.5) });
    });
    mags.forEach(([m, v], i) => {
      const st = 1.0 + i * 1.6, y = 370 + i * 92;
      T(g, bx0 - 18, y + 36, m, { size: 24, weight: 600, anchor: "end", fill: C.ink2, op: fin(lt, st, 0.4) });
      const w = (sx(v) - bx0) * easeOut((lt - st) / 0.9);
      if (w > 0) R(g, bx0, y + 10, w, 40, { rx: 8, fill: C.blue });
      T(g, bx0 + w + 14, y + 39, String(v), { size: 26, weight: 700, op: fin(lt, st + 0.7, 0.3) });
    });
    T(g, 1080, 300, "Uniform INT4: perplexity change", { size: 28, weight: 650, fill: C.ink2, op: fin(lt, 1.2) });
    const cards = [
      ["OPT-125M", "+2.20%", true, "within a 5% SLO"],
      ["TinyLlama-1.1B", "+9.41%", false, "outside a 5% SLO"],
      ["Qwen2.5-3B", "≈ 12462×", false, "collapse"],
    ];
    cards.forEach(([m, v, ok, s], i) => {
      const st = 1.6 + i * 1.6, y = 340 + i * 150;
      const gg = G(g, fin(lt, st, 0.4));
      R(gg, 1080, y, 720, 124, { rx: 18, fill: ok ? C.goodFill : C.badFill });
      T(gg, 1112, y + 50, m, { size: 26, weight: 650, fill: C.ink2 });
      T(gg, 1112, y + 96, `${ok ? "✓" : "✗"} ${s}`, { size: 23, weight: 600, fill: ok ? C.good : C.bad });
      T(gg, 1770, y + 80, v, { size: 52, weight: 750, anchor: "end", fill: C.ink });
    });
    caption(g, lt, 6.2, ["KV magnitudes grow with model scale, and INT4 error grows with them (e₄ = m / 14).", "No single compression ratio is safe for every model."]);
  });

  // 5 · adaptive codec + certificate
  const kvGrid = (() => {
    const pick = (n, k, seed) => { const r = seeded(seed), idx = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return new Set(idx.slice(0, k)); };
    const N = 120;
    const kF = pick(N, 4, 7);       // Qwen2.5-3B, B=0.2: K = 0% INT4 / 97% INT8 / 3% FP16
    const vI = pick(N, 62, 11);     //                    V = 52% INT4 / 48% INT8 / 0% FP16
    return {
      K: [...Array(N)].map((_, i) => (kF.has(i) ? 2 : 1)),
      V: [...Array(N)].map((_, i) => (vI.has(i) ? 0 : 1)),
    };
  })();
  add(12, (g, lt) => {
    title(g, lt, "Adaptive precision under a verified error budget B");
    const modeCol = [C.ord1, C.blue, C.ord3];
    [["INT4 if e₄ ≤ B", 0], ["INT8 if e₈ ≤ B", 1], ["FP16 otherwise", 2]].forEach(([s, k], i) => {
      const x = 560 + i * 300;
      R(g, x - 112, 214, 26, 26, { rx: 6, fill: modeCol[k], op: fin(lt, 0.4 + i * 0.2) });
      T(g, x - 74, 236, s, { size: 25, weight: 600, fill: C.ink2, op: fin(lt, 0.4 + i * 0.2) });
    });
    const grid = (x0, name, arr, share) => {
      T(g, x0, 340, name, { size: 30, weight: 700, op: fin(lt, 0.8) });
      T(g, x0 + 720, 340, share, { size: 24, weight: 600, anchor: "end", fill: C.ink2, op: fin(lt, 4.4) });
      arr.forEach((m, i) => {
        const c = Math.floor(i / 6), r = i % 6;
        const sweep = clamp((lt - 1.4 - c * 0.13) / 0.3);
        R(g, x0 + c * 36, 368 + r * 36, 30, 30, { rx: 5, fill: sweep > 0.5 ? modeCol[m] : C.fp16, op: fin(lt, 0.8) });
      });
    };
    grid(180, "K blocks", kvGrid.K, "INT8 97% · FP16 3%");
    grid(1020, "V blocks", kvGrid.V, "INT4 52% · INT8 48%");
    // verification scan
    const scan = clamp((lt - 5.0) / 1.6);
    if (lt > 5.0 && lt < 6.8) {
      const sxp = lerp(170, 1750, scan);
      E("rect", { x: sxp - 3, y: 354, width: 6, height: 240, rx: 3, fill: C.good, opacity: 0.8 }, g);
    }
    pill(g, 960, 690, "G2 ✓  max error ≤ B, checked on the actual packed bytes", { size: 27, fill: C.good, bg: C.goodFill, stroke: "none", op: fin(lt, 6.6) });
    T(g, 960, 770, "Qwen2.5-3B · B = 0.2 · 2.16× fewer bytes", { size: 28, weight: 650, anchor: "middle", fill: C.ink2, op: fin(lt, 7.2) });
    caption(g, lt, 8.0, ["Each 128-element block takes the cheapest precision that fits the budget.", "Every write is verified before it commits."]);
  });

  // 6 · deployment resolver
  const CAND = [
    { n: "fp16", r: "1.000", b: 2048 },
    { n: "uniform INT8", r: "1.939", b: 1056 },
    { n: "certified B=0.2", r: "2.549", b: 804 },
    { n: "certified B=0.5", r: "2.604", b: 787 },
    { n: "uniform INT4", r: "3.765", b: 544 },
  ];
  const SCEN = [
    { link: "PCIe", mem: "no limit", Q: [1, 1, 1, 1, 0], L: [1, 1, 1, 1, 1], M: [1, 1, 1, 1, 1], pick: 3,
      v: "certified B=0.5", d: "2.604× · 787 KB · 160 µs", kind: "ok" },
    { link: "Same-GPU", mem: "no limit", Q: [1, 1, 1, 1, 0], L: [1, 0, 0, 0, 0], M: [1, 1, 1, 1, 1], pick: 0,
      v: "fp16: don’t compress", d: ["compression never pays", "on this link"], kind: "fp16" },
    { link: "PCIe", mem: "700 KB", Q: [1, 1, 1, 1, 0], L: [1, 1, 1, 1, 1], M: [0, 0, 0, 0, 1], pick: -1,
      v: "Infeasible", d: ["no candidate meets all", "three constraints"], kind: "bad" },
  ];
  const SC = 5.2;
  add(SC * 3 + 0.8, (g, lt) => {
    title(g, lt, "The deployment resolver");
    const si = Math.min(Math.floor(lt / SC), 2), s = SCEN[si], st = lt - si * SC;
    const prev = si > 0 ? SCEN[si - 1] : null;
    // constraints panel
    R(g, 90, 280, 430, 470, { rx: 20, fill: C.surface, stroke: C.border, sw: 1.5 });
    T(g, 120, 330, "Operator constraints", { size: 26, weight: 700 });
    pill(g, 1840, 128, `${si + 1} / 3`, { size: 22, anchor: "end", fill: C.ink2, op: fin(lt, 0.3) });
    const rowsC = [["Model", "TinyLlama-1.1B"], ["Quality ε", "ΔPPL ≤ 3%"], ["Link", s.link], ["Memory M", s.mem]];
    rowsC.forEach(([k, v], i) => {
      const changed = prev && ((k === "Link" && prev.link !== s.link) || (k === "Memory M" && prev.mem !== s.mem));
      T(g, 120, 400 + i * 88, k, { size: 22, fill: C.muted });
      if (changed) R(g, 112, 412 + i * 88, 392, 44, { rx: 10, fill: C.wash, op: 1 - fin(st, 2.6, 0.8) * 0.6 });
      T(g, 124, 444 + i * 88, v, { size: 28, weight: 650, fill: changed ? C.blue : C.ink });
    });
    // candidate table
    const tx = 600, cols = [tx, tx + 340, tx + 470, tx + 600, tx + 680, tx + 760];
    ["candidate", "ratio", "bytes", "Q", "L", "M"].forEach((h, i) => T(g, cols[i] + (i >= 3 ? 20 : 0), 320, h, { size: 22, weight: 650, fill: C.muted, anchor: i >= 1 && i <= 2 ? "end" : i >= 3 ? "middle" : "start" }));
    // right-align ratio/bytes columns at their x
    CAND.forEach((c, i) => {
      const y = 380 + i * 82;
      const chosen = s.pick === i && st > 3.0;
      if (chosen) R(g, tx - 20, y - 46, 820, 72, { rx: 14, fill: C.wash, stroke: C.blue, sw: 2, op: fin(st, 3.0, 0.4) });
      T(g, tx, y, c.n, { size: 27, weight: 600 });
      T(g, cols[1], y, c.r, { size: 27, anchor: "end", tab: true, fill: C.ink2 });
      T(g, cols[2], y, `${c.b} KB`, { size: 27, anchor: "end", tab: true, fill: C.ink2 });
      [["Q", 0.6], ["L", 1.3], ["M", 2.0]].forEach(([k, t0], j) => {
        const ok = s[k][i];
        T(g, cols[3 + j] + 20, y, ok ? "✓" : "✗", { size: 30, weight: 800, anchor: "middle", fill: ok ? C.good : C.bad, op: fin(st, t0 + i * 0.08, 0.25) });
      });
    });
    // verdict
    const vop = fin(st, 3.0, 0.4);
    const vg = G(g, vop);
    R(vg, 1460, 280, 380, 470, { rx: 20, fill: s.kind === "bad" ? C.badFill : s.kind === "fp16" ? C.surface2 : C.wash });
    T(vg, 1490, 336, "Verdict", { size: 24, weight: 650, fill: C.muted });
    const words = s.v.split(": ");
    T(vg, 1490, 430, words[0], { size: 42, weight: 750, fill: s.kind === "bad" ? C.bad : C.ink });
    if (words[1]) T(vg, 1490, 482, words[1], { size: 34, weight: 700, fill: C.ink });
    [].concat(s.d).forEach((line, k) => T(vg, 1490, (words[1] ? 560 : 500) + k * 34, line, { size: 24, fill: C.ink2 }));
    caption(g, lt, 1.0, "Constraints in; the highest-compression feasible point out, or an explicit “don’t compress”.");
  });

  // 7 · live system
  add(9.5, (g, lt) => {
    title(g, lt, "Validated on live serving state");
    worker(g, 140, 270, 380, 330, "Prefill worker", "live vLLM engine, paged KV");
    worker(g, 1400, 270, 380, 330, "Decode worker", "dequantize → decode");
    L(g, 540, 435, 1380, 435, { sw: 3 });
    const p = easeOut((lt - 0.9) / 2.4);
    const ex = lerp(560, 1080, p);
    const eg = G(g, fin(lt, 0.6));
    R(eg, ex, 375, 300, 120, { rx: 16, fill: C.surface, stroke: C.blue, sw: 2.5 });
    T(eg, ex + 150, 418, "certificate envelope", { size: 22, weight: 700, anchor: "middle", fill: C.blue });
    T(eg, ex + 150, 452, "B · mode map · scales", { size: 20, anchor: "middle", fill: C.ink2 });
    T(eg, ex + 150, 478, "G2 verdict · sha256", { size: 20, anchor: "middle", fill: C.ink2 });
    pill(g, 1590, 248, "sha256 ✓", { size: 24, fill: C.good, bg: C.goodFill, stroke: "none", op: fin(lt, 3.4, 0.4) });
    const tiles = [["220 / 220", "writes verified on live vLLM paged KV"], ["32 / 32", "greedy tokens match the fp16 run"], ["0.57–1.16 ms", "fused codec for 23–92 MB of KV"]];
    tiles.forEach(([v, s], i) => {
      const gg = G(g, fin(lt, 4.0 + i * 0.6, 0.5));
      const x = 210 + i * 520;
      R(gg, x, 660, 460, 170, { rx: 20, fill: C.surface, stroke: C.border, sw: 1.5 });
      T(gg, x + 32, 742, v, { size: 54, weight: 750 });
      T(gg, x + 32, 792, s, { size: 23, fill: C.ink2 });
    });
    caption(g, lt, 1.2, "The certificate travels with the KV chunk and is checked again at the receiver.");
  });

  // 8 · outro
  add(7, (g, lt) => {
    T(g, 960, 420, "Treat KV cache compression as a", { size: 64, weight: 700, anchor: "middle", op: fin(lt, 0.2, 0.6) });
    T(g, 960, 506, "deployment decision,", { size: 64, weight: 750, anchor: "middle", fill: C.blue, op: fin(lt, 0.7, 0.6) });
    T(g, 960, 592, "not an unconditional optimization.", { size: 64, weight: 700, anchor: "middle", op: fin(lt, 1.2, 0.6) });
    T(g, 960, 760, "When Does KV Cache Compression Pay?  ·  GPC 2026", { size: 30, weight: 600, anchor: "middle", fill: C.ink2, op: fin(lt, 2.2) });
    T(g, 960, 810, "functionhx.github.io/kv-compression-pays", { size: 28, anchor: "middle", fill: C.blue, op: fin(lt, 2.6) });
  });

  // ── timeline ─────────────────────────────────────────────────────────
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const FADE = 0.4;
  function seek(t) {
    t = Math.min(Math.max(t, 0), total - 1e-6);
    let i = 0, lt = t;
    while (i < scenes.length - 1 && lt >= scenes[i].dur) { lt -= scenes[i].dur; i++; }
    const s = scenes[i];
    root.innerHTML = "";
    const first = i === 0, last = i === scenes.length - 1;
    const op = Math.min(first ? 1 : lt / FADE, last ? 1 : (s.dur - lt) / FADE, 1);
    const g = G(root, Math.max(op, 0));
    s.draw(g, lt);
    if (!first && !last) T(root, 60, 1040, "When Does KV Cache Compression Pay?  ·  GPC 2026", { size: 20, fill: C.muted });
  }
  window.VIDEO = { seek, total, scenes: scenes.map((s) => s.dur) };

  // ── preview controls (hidden when rendering) ─────────────────────────
  if (new URLSearchParams(location.search).has("render")) { document.body.classList.add("render"); seek(0); return; }
  const btn = document.getElementById("play"), scrub = document.getElementById("scrub"), out = document.getElementById("time");
  let t = 0, playing = false, last = null;
  const show = () => { seek(t); scrub.value = Math.round((t / total) * 1000); out.textContent = `${t.toFixed(1)} / ${total.toFixed(1)} s`; };
  function loop(now) {
    if (!playing) return;
    if (last != null) t += (now - last) / 1000;
    last = now;
    if (t >= total) { t = total; playing = false; btn.textContent = "▶ Play"; }
    show();
    if (playing) requestAnimationFrame(loop);
  }
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? "❚❚ Pause" : "▶ Play"; last = null; if (t >= total) t = 0; if (playing) requestAnimationFrame(loop); };
  scrub.oninput = () => { t = (scrub.value / 1000) * total; show(); };
  show();
})();

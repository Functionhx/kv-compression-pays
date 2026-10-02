// Hero animation: disaggregated serving + two KV transfer races on the dual-L40 PCIe P2P link.
// Race timings are Table 5 medians, scaled per race so the fp16 transfer takes RACE_FP16 seconds.
(() => {
  const host = document.getElementById("heroAnim");
  if (!host) return;
  const NS = "http://www.w3.org/2000/svg";
  const P2P = window.PAPER.p2p.rows;
  const W = 960, H = 330;
  const RACE_FP16 = 3.0;

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) k === "text" ? (n.textContent = v) : n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  }
  const lerp = (a, b, p) => a + (b - a) * Math.min(Math.max(p, 0), 1);
  const ease = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p));

  // ── races from Table 5 ────────────────────────────────────────────────
  function race(row) {
    const k = RACE_FP16 / row.fp16Xfer;
    return { row, codec: row.codec * k, xfer: row.xfer * k, fp16: RACE_FP16, cert: (row.codec + row.xfer) * k };
  }
  const small = race(P2P[0]); // 23 MB: fp16 0.89 ms vs 0.57 + 0.39 ms
  const large = race(P2P[2]); // 92 MB: fp16 3.51 ms vs 1.02 + 1.42 ms

  const INTRO = 0.7, HOLD = 2.0;
  const scenes = [
    { id: "flow", dur: 4.2 },
    { id: "race", dur: INTRO + Math.max(small.fp16, small.cert) + HOLD, r: small },
    { id: "race", dur: INTRO + Math.max(large.fp16, large.cert) + HOLD, r: large },
    { id: "end", dur: 4.6 },
  ];
  const total = scenes.reduce((a, s) => a + s.dur, 0);

  // ── static frame ─────────────────────────────────────────────────────
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Animation: KV cache transfer between prefill and decode workers; fp16 vs certified compressed races at 23 MB and 92 MB" }, host);
  const title = el("text", { x: W / 2, y: 30, "text-anchor": "middle", class: "ha-title" }, svg);
  const caption = el("text", { x: W / 2, y: H - 34, "text-anchor": "middle", class: "ha-cap" }, svg);
  const note = el("text", { x: W / 2, y: H - 12, "text-anchor": "middle", class: "ha-note" }, svg);

  const nodeY = 78, nodeH = 160;
  function worker(x, name, sub) {
    const g = el("g", {}, svg);
    el("rect", { x, y: nodeY, width: 150, height: nodeH, rx: 14, class: "ha-node" }, g);
    el("text", { x: x + 75, y: nodeY + 30, "text-anchor": "middle", class: "ha-node-t", text: name }, g);
    el("text", { x: x + 75, y: nodeY + 48, "text-anchor": "middle", class: "ha-node-s", text: sub }, g);
    for (let i = 0; i < 2; i++) {
      el("rect", { x: x + 22 + i * 56, y: nodeY + 70, width: 50, height: 62, rx: 7, class: "ha-gpu" }, g);
      el("text", { x: x + 47 + i * 56, y: nodeY + 106, "text-anchor": "middle", class: "ha-gpu-t", text: "GPU" }, g);
    }
    return g;
  }
  worker(30, "Prefill worker", "vLLM · paged KV");
  worker(W - 180, "Decode worker", "greedy decode");

  const X0 = 196, X1 = W - 196; // link span between the workers

  // scene: flow
  const gFlow = el("g", {}, svg);
  el("line", { x1: X0, x2: X1, y1: 158, y2: 158, class: "ha-link" }, gFlow);
  el("text", { x: W / 2, y: 192, "text-anchor": "middle", class: "ha-link-t", text: "network link" }, gFlow);
  const blocks = Array.from({ length: 7 }, () => el("rect", { width: 22, height: 22, rx: 4, y: 147, class: "ha-kv" }, gFlow));

  // scene: race
  const gRace = el("g", {}, svg);
  const laneF = 122, laneC = 196;
  el("line", { x1: X0, x2: X1, y1: laneF, y2: laneF, class: "ha-link" }, gRace);
  el("line", { x1: X0, x2: X1, y1: laneC, y2: laneC, class: "ha-link" }, gRace);
  el("text", { x: X0 + 4, y: laneF - 18, class: "ha-lane", text: "fp16 · no codec" }, gRace);
  el("text", { x: X0 + 4, y: laneC - 26, class: "ha-lane", text: "certified B=0.2 · 2.55×" }, gRace);
  const booth = el("rect", { x: X0 + 6, y: laneC - 19, width: 86, height: 38, rx: 9, class: "ha-booth" }, gRace);
  const boothT = el("text", { x: X0 + 49, y: laneC + 36, "text-anchor": "middle", class: "ha-booth-t" }, gRace);
  const bar = el("rect", { x: X0 + 14, y: laneC + 12, height: 3, rx: 1.5, class: "ha-bar" }, gRace);
  const pF = el("rect", { y: laneF - 12, height: 24, width: 64, rx: 5, class: "ha-pf" }, gRace);
  const pC = el("rect", { y: laneC - 12, height: 24, width: 64, rx: 5, class: "ha-pc" }, gRace);
  const tF = el("text", { x: X1 - 4, y: laneF - 18, "text-anchor": "end", class: "ha-timer" }, gRace);
  const tC = el("text", { x: X1 - 4, y: laneC - 26, "text-anchor": "end", class: "ha-timer" }, gRace);
  const sizeT = el("text", { x: W / 2, y: 54, "text-anchor": "middle", class: "ha-size" }, gRace);

  // scene: end card
  const gEnd = el("g", {}, svg);
  const cards = [
    ["Same-GPU", "S* = ∞", "compression never pays"],
    ["PCIe", "1.06–2.08 MB", "crossover chunk size"],
    ["Dual-GPU P2P", "23–46 MB", "crossover chunk size"],
  ];
  cards.forEach(([a, b, c], i) => {
    const x = 214 + i * 182;
    el("rect", { x, y: 92, width: 168, height: 128, rx: 12, class: "ha-card" }, gEnd);
    el("text", { x: x + 84, y: 124, "text-anchor": "middle", class: "ha-node-s", text: a }, gEnd);
    el("text", { x: x + 84, y: 166, "text-anchor": "middle", class: "ha-big", text: b }, gEnd);
    el("text", { x: x + 84, y: 194, "text-anchor": "middle", class: "ha-node-s", text: c }, gEnd);
  });

  // ── frame ────────────────────────────────────────────────────────────
  function sceneAt(t) {
    t = ((t % total) + total) % total;
    for (const s of scenes) { if (t < s.dur) return [s, t]; t -= s.dur; }
    return [scenes[0], 0];
  }
  const fade = (t, dur) => Math.min(1, t / 0.35, (dur - t) / 0.35);

  function draw(t) {
    const [s, lt] = sceneAt(t);
    const op = fade(lt, s.dur);
    gFlow.style.display = s.id === "flow" ? "" : "none";
    gRace.style.display = s.id === "race" ? "" : "none";
    gEnd.style.display = s.id === "end" ? "" : "none";
    for (const g of [gFlow, gRace, gEnd, title, caption, note]) g.style.opacity = op;

    if (s.id === "flow") {
      title.textContent = "Disaggregated serving moves KV cache between workers";
      caption.textContent = "Every request’s KV cache is shipped from the prefill worker to the decode worker.";
      note.textContent = "";
      blocks.forEach((b, i) => {
        const p = ((lt / 2.4 + i / blocks.length) % 1);
        b.setAttribute("x", lerp(X0 + 4, X1 - 26, p));
        b.style.opacity = Math.min(1, p * 8, (1 - p) * 8);
      });
      return;
    }

    if (s.id === "end") {
      title.textContent = "The verdict depends on the link and the chunk size";
      caption.textContent = "So we decide per link, per chunk size, and per model, and say “don’t compress” when it doesn’t pay.";
      note.textContent = "";
      return;
    }

    // race
    const r = s.r, row = r.row;
    const rt = lt - INTRO;
    const fWin = r.fp16 < r.cert;
    title.textContent = fWin ? "Fewer bytes, but slower: the codec tax dominates" : "Above the crossover, compression pays";
    sizeT.textContent = `${row.mb} MB of fp16 KV  ·  ${row.tokens}-token prefill`;
    caption.textContent = rt < Math.max(r.fp16, r.cert)
      ? "Same chunk, two paths: ship fp16 as is, or encode first and ship fewer bytes."
      : fWin
      ? `fp16 arrives first: ${row.fp16Xfer} ms vs ${row.codec} + ${row.xfer} = ${(row.codec + row.xfer).toFixed(2)} ms.`
      : `Compressed arrives first: ${(row.codec + row.xfer).toFixed(2)} ms vs ${row.fp16Xfer} ms for fp16.`;
    note.textContent = "Timing to scale · dual-GPU PCIe P2P";

    const fW = 64, cW = 64 / 2.55;
    // fp16 lane
    const pf = ease(rt / r.fp16);
    pF.setAttribute("x", lerp(X0 + 4, X1 - fW - 4, rt <= 0 ? 0 : rt >= r.fp16 ? 1 : rt / r.fp16));
    // certified lane: codec in the booth, then transfer
    const inCodec = rt < r.codec;
    const cp = Math.min(Math.max(rt / r.codec, 0), 1);
    const w = lerp(fW, cW, ease(cp));
    pC.setAttribute("width", w);
    if (inCodec) pC.setAttribute("x", X0 + 49 - w / 2);
    else pC.setAttribute("x", lerp(X0 + 49 - cW / 2, X1 - cW - 4, (rt - r.codec) / r.xfer));
    bar.setAttribute("width", 70 * cp);
    booth.classList.toggle("on", rt > 0 && inCodec);
    boothT.textContent = `codec ${row.codec} ms`;

    const ms = (sec, real, end) => (sec >= end ? `${real.toFixed(2)} ms` : `${((Math.max(sec, 0) / end) * real).toFixed(2)} ms`);
    const fDone = rt >= r.fp16, cDone = rt >= r.cert;
    tF.textContent = ms(rt, row.fp16Xfer, r.fp16) + (fDone ? (fWin ? "  ✓ first" : "  ✓") : "");
    tC.textContent = ms(rt, row.codec + row.xfer, r.cert) + (cDone ? (!fWin ? "  ✓ first" : "  ✓") : "");
    tF.classList.toggle("win", fDone && fWin);
    tC.classList.toggle("win", cDone && !fWin);
    void pf;
  }

  // ── playback (pauses offscreen and in background tabs) ───────────────
  const btn = document.getElementById("heroPlay");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let playing = !reduce, visible = true, t = 0, last = null, raf = null;

  function loop(now) {
    raf = null;
    if (last != null) t += (now - last) / 1000;
    last = now;
    draw(t);
    schedule();
  }
  function schedule() {
    if (playing && visible && !document.hidden && raf == null) raf = requestAnimationFrame(loop);
    if (!(playing && visible && !document.hidden)) last = null;
  }
  function setPlaying(p) {
    playing = p;
    btn.textContent = p ? "❚❚ Pause" : "▶ Play";
    btn.setAttribute("aria-pressed", String(!p));
    schedule();
  }
  btn.addEventListener("click", () => setPlaying(!playing));
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; schedule(); }).observe(host);
  document.addEventListener("visibilitychange", schedule);

  // first frame must already be visible (fade-in done) in case playback is paused or throttled
  t = reduce ? scenes[0].dur + scenes[1].dur + scenes[2].dur - HOLD / 2 : 0.4;
  draw(t);
  host.seek = (sec) => { t = sec; draw(t); }; // used by the page's visual checks
  setPlaying(playing);
})();

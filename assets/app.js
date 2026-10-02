(() => {
  const D = window.PAPER;
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);

  // ── helpers ────────────────────────────────────────────────────────────
  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgIn(container, w, h) {
    container.innerHTML = "";
    return el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img" }, container);
  }
  const fill = (v) => `fill: var(${v})`;

  // Bar with a 4px rounded data-end and a square baseline end.
  function hBar(x, y, w, h, r = 4) {
    r = Math.min(r, w, h / 2);
    if (w <= 0) return "";
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  }
  function vBar(x, y0, w, h, r = 4) {
    r = Math.min(r, h, w / 2);
    if (h <= 0) return "";
    const top = y0 - h;
    return `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${y0}Z`;
  }

  const tip = $("tooltip");
  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.classList.add("show");
    const pad = 14;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  const hideTip = () => tip.classList.remove("show");
  function hover(node, html) {
    node.addEventListener("pointermove", (e) => showTip(e, typeof html === "function" ? html() : html));
    node.addEventListener("pointerleave", hideTip);
    node.setAttribute("tabindex", "0");
    node.addEventListener("focus", () => {
      const b = node.getBoundingClientRect();
      showTip({ clientX: b.right, clientY: b.top }, typeof html === "function" ? html() : html);
    });
    node.addEventListener("blur", hideTip);
  }
  const sw = (v) => `<span class="sw" style="background: var(${v})"></span>`;

  function fmtSize(kb) {
    if (kb < 1000) return `${Math.round(kb)} KB`;
    const mb = kb / 1000;
    return `${mb < 10 ? mb.toFixed(2) : mb < 100 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }
  function legend(container, items) {
    container.innerHTML = items
      .map(([cls, label, extra]) => `<span><i class="${extra || ""}" style="background: var(${cls})"></i>${label}</span>`)
      .join("");
  }
  function segment(container, attr, onChange) {
    container.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        container.querySelectorAll("button").forEach((o) => {
          o.classList.toggle("on", o === b);
          o.setAttribute("aria-checked", o === b ? "true" : "false");
        });
        onChange(b.dataset[attr]);
      })
    );
  }

  // ── 1. crossover explorer ──────────────────────────────────────────────
  const X_MIN = 64, X_MAX = 131072; // KB, log axis 64 KB → 131 MB
  const slider = $("sizeSlider");
  const toKB = (v) => X_MIN * Math.pow(X_MAX / X_MIN, v / 1000);
  const fromKB = (kb) => (1000 * Math.log(kb / X_MIN)) / Math.log(X_MAX / X_MIN);
  let link = "pcie";
  slider.value = Math.round(fromKB(2000));

  function crossRows() {
    const g = D.grid;
    if (link === "p2p") {
      const p = D.p2p;
      return [{
        path: "Certified B=0.2 (fused)",
        segs: [
          { a: p.measuredMinMB * 1000, b: p.crossLoMB * 1000, kind: "fp16", note: "fp16 transfer is faster: codec + transfer is 2.1× fp16 at 11.5 MB, and 0.96 vs 0.89 ms at 23 MB." },
          { a: p.crossLoMB * 1000, b: p.crossHiMB * 1000, kind: "cross", note: "The measured crossover lies between 23 MB and 46 MB of fp16 KV." },
          { a: p.crossHiMB * 1000, b: p.measuredMaxMB * 1000, kind: "pays", note: "Certified path pays: 1.42 vs 1.76 ms at 46 MB, 2.44 vs 3.51 ms at 92 MB." },
        ],
      }];
    }
    const rows = link === "pcie" ? g.pcie : g.proxy;
    return rows.map((r) => {
      const lo = g.measuredMinKB, hi = g.measuredMaxKB;
      if (!isFinite(r.crossKB)) {
        const why = r.path.includes("GEMM")
          ? "S* = ∞: the dequantization tax (1355–2766 µs in the scale-GEMM leg) dominates transport savings in every cell up to 16 MB."
          : "S* = ∞: the fixed codec cost (≈ 53–92 µs) is never repaid on the overhead-dominated same-GPU path.";
        return { path: r.path, segs: [{ a: lo, b: hi, kind: "fp16", note: why }] };
      }
      return {
        path: r.path,
        segs: [
          { a: lo, b: r.crossKB, kind: "fp16", note: `fp16 transport is faster below S* = ${r.crossKB} KB.` },
          { a: r.crossKB, b: hi, kind: "pays", note: `Compressed path beats fp16 above S* = ${r.crossKB} KB (β = 42.6 ps/B).` },
        ],
      };
    });
  }

  function drawCrossover() {
    const box = $("crossChart");
    const W = Math.max(box.clientWidth, 320);
    const labelW = W < 560 ? 118 : 170;
    const rows = crossRows();
    const rowH = 34, top = 28, bottom = 34;
    const H = top + rows.length * rowH + bottom;
    const svg = svgIn(box, W, H);
    const x0 = labelW, x1 = W - 12;
    const sx = (kb) => x0 + ((x1 - x0) * Math.log(kb / X_MIN)) / Math.log(X_MAX / X_MIN);

    // pattern for the uncertain crossover zone
    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 6, height: 6, style: "fill: var(--accent-wash)" }, pat);
    el("rect", { width: 2, height: 6, style: fill("--series-1") }, pat);

    // disaggregated-serving band (256 KB – 4 MB)
    el("rect", { x: sx(256), y: top - 8, width: sx(4096) - sx(256), height: rows.length * rowH + 8, style: fill("--band"), rx: 6 }, svg);
    el("text", { x: (sx(256) + sx(4096)) / 2, y: top - 13, "text-anchor": "middle", text: "disaggregated chunk range" }, svg);

    // ticks
    const ticks = [64, 256, 1024, 4096, 16384, 65536];
    const tickLab = { 64: "64 KB", 256: "256 KB", 1024: "1 MB", 4096: "4 MB", 16384: "16 MB", 65536: "64 MB" };
    const yAxis = top + rows.length * rowH;
    for (const t of ticks) {
      el("line", { x1: sx(t), x2: sx(t), y1: top - 4, y2: yAxis, class: "gridline" }, svg);
      el("text", { x: sx(t), y: yAxis + 18, "text-anchor": "middle", text: tickLab[t] }, svg);
    }
    el("line", { x1: x0, x2: x1, y1: yAxis, y2: yAxis, class: "axisline" }, svg);

    const colors = { fp16: "--baseline", pays: "--series-1" };
    rows.forEach((r, i) => {
      const y = top + i * rowH + 9;
      el("text", { x: 0, y: y + 12, class: "lab", text: r.path }, svg);
      r.segs.forEach((s) => {
        const xa = sx(s.a) + 1, xb = sx(s.b) - 1;
        const attrs = { x: xa, y, width: Math.max(xb - xa, 1), height: 16, rx: 4, class: "mark" };
        attrs.style = s.kind === "cross" ? "fill: url(#hatch)" : fill(colors[s.kind]);
        const rect = el("rect", attrs, svg);
        const label = s.kind === "pays" ? "compressed pays" : s.kind === "fp16" ? "fp16 wins" : "crossover zone";
        hover(rect, `<b>${r.path}</b><br>${fmtSize(s.a)} – ${fmtSize(s.b)}: <b>${label}</b><br>${s.note}`);
      });
    });

    // size marker
    const kb = toKB(+slider.value);
    const mx = sx(kb);
    el("line", { x1: mx, x2: mx, y1: top - 6, y2: yAxis, style: "stroke: var(--text-primary); stroke-width: 2" }, svg);
    el("circle", { cx: mx, cy: yAxis, r: 5, style: "fill: var(--text-primary); stroke: var(--surface-1); stroke-width: 2" }, svg);

    $("sizeOut").textContent = fmtSize(kb);
    $("crossVerdict").innerHTML = crossVerdict(kb, rows);
  }

  function crossVerdict(kb, rows) {
    const s = `<b>${fmtSize(kb)}</b>`;
    if (link === "p2p") {
      const p = D.p2p;
      if (kb < p.measuredMinMB * 1000 || kb > p.measuredMaxMB * 1000)
        return `At ${s}: outside the measured range (11.5–92 MB).`;
      if (kb < p.crossLoMB * 1000) return `At ${s} on dual-GPU P2P: <b>fp16 wins</b>. The fused codec’s fixed cost is not yet repaid.`;
      if (kb < p.crossHiMB * 1000) return `At ${s}: inside the measured crossover zone (23–46 MB). The certified path catches up with fp16 here.`;
      return `At ${s}: <b>compression pays</b>. The certified path’s codec + transfer is below the fp16 transfer.`;
    }
    const g = D.grid;
    if (kb < g.measuredMinKB || kb > g.measuredMaxKB) return `At ${s}: outside the measured range (64 KB–16 MB).`;
    const paying = rows.filter((r) => r.segs.some((x) => x.kind === "pays" && kb >= x.a));
    if (link === "proxy")
      return `At ${s} on the same-GPU path: <b>no compressed path beats fp16</b> (S* = ∞ for every path). Resolver verdict: fp16.`;
    if (!paying.length)
      return `At ${s} on PCIe: <b>fp16 wins on every path</b>. The fixed codec tax dominates, and a byte-only model would wrongly say compression helps.`;
    return `At ${s} on PCIe: <b>${paying.length} of ${rows.length}</b> measured compressed paths pay (${paying.map((r) => r.path).join(", ")}). The INT8-GEMM consumer never pays.`;
  }

  segment($("linkSeg"), "link", (v) => {
    link = v;
    if (v === "p2p" && toKB(+slider.value) < 11500) slider.value = Math.round(fromKB(60000));
    if (v !== "p2p" && toKB(+slider.value) > 16384) slider.value = Math.round(fromKB(2000));
    drawCrossover();
  });
  slider.addEventListener("input", drawCrossover);
  legend($("crossLegend"), [
    ["--baseline", "fp16 transport wins"],
    ["--series-1", "compressed path pays"],
    ["--series-1", "measured crossover zone", "hatch"],
    ["--band", "256 KB–4 MB chunk range", "band"],
  ]);

  // ── 3. SLO matrix (Table 2) ────────────────────────────────────────────
  const CODECS = [
    { key: "INT8", name: "Uniform INT8", sub: "g=128", certified: false },
    { key: "B02", name: "Adaptive B=0.2", sub: "certified", certified: true },
    { key: "B05", name: "Adaptive B=0.5", sub: "certified", certified: true },
    { key: "INT4", name: "Uniform INT4", sub: "g=128", certified: false },
  ];
  let slo = 1;
  function drawMatrix() {
    const t = $("sloMatrix");
    let html = `<thead><tr><th>Model</th>${CODECS.map((c) => `<th>${c.name}<span class="tag">${c.sub}</span></th>`).join("")}</tr></thead><tbody>`;
    for (const m of D.models) {
      const q = D.quality[m];
      const passing = CODECS.filter((c) => q[c.key].dppl <= slo);
      const best = passing.reduce((a, c) => (!a || q[c.key].ratio > q[a.key].ratio ? c : a), null);
      html += `<tr><td>${m}</td>`;
      for (const c of CODECS) {
        const v = q[c.key];
        const pass = v.dppl <= slo;
        const dp = v.collapse ? v.collapse : `+${v.dppl.toFixed(2)}%`;
        html += `<td><div class="cell ${pass ? "pass" : "fail"} ${best === c ? "best" : ""}">
          <div class="dp">${dp}</div>
          <div class="meta">${v.ratio.toFixed(3)}× · max err ${v.err}</div>
          <div class="st">${pass ? "✓ meets" : "✗ violates"} ≤${slo}%${best === c ? " · max ratio" : ""}</div>
        </div></td>`;
      }
      html += "</tr>";
    }
    t.innerHTML = html + "</tbody>";
  }
  segment($("sloSeg"), "slo", (v) => { slo = +v; drawMatrix(); });

  // ── 4. magnitude chart (Sec. 4.4) ──────────────────────────────────────
  function drawMag() {
    const box = $("magChart");
    const W = Math.max(box.clientWidth, 280);
    const rows = D.magnitude;
    const labelW = 112, rowH = 34, t = 6, b = 30;
    const H = t + rows.length * rowH + b;
    const svg = svgIn(box, W, H);
    const x0 = labelW, x1 = W - 44;
    const lo = 1, hi = 1000;
    const sx = (v) => x0 + ((x1 - x0) * Math.log10(v / lo)) / Math.log10(hi / lo);
    const yAxis = t + rows.length * rowH;
    for (const v of [1, 10, 100, 1000]) {
      el("line", { x1: sx(v), x2: sx(v), y1: t, y2: yAxis, class: v === 1 ? "axisline" : "gridline" }, svg);
      el("text", { x: sx(v), y: yAxis + 18, "text-anchor": "middle", text: v.toLocaleString() }, svg);
    }
    rows.forEach((r, i) => {
      const y = t + i * rowH + 7;
      el("text", { x: 0, y: y + 14, class: "lab", text: r.model }, svg);
      const p = el("path", { d: hBar(sx(lo), y, sx(r.m) - sx(lo), 20), style: fill("--series-1"), class: "mark" }, svg);
      el("text", { x: sx(r.m) + 6, y: y + 14, class: "val", text: r.m }, svg);
      const q = D.quality[r.model];
      const extra = q ? `<br>measured uniform-INT4 max err: ${q.INT4.err} · ΔPPL ${q.INT4.collapse || "+" + q.INT4.dppl + "%"}` : "<br>(magnitude probe only, no PPL row)";
      hover(p, `<b>${r.model}</b><br>worst-case per-block |KV| m* = <b>${r.m}</b>${extra}`);
    });
  }

  // ── 6. deployment resolver (Sec. 3.5, Table 3) ─────────────────────────
  const R = D.resolver;
  // Sec. 4.7 / Table 3: each SLO tier opens candidates — ≤1%: up to B=0.2, ≤3%: + B=0.5,
  // ≤5%: + uniform INT4 ("the relaxed ≤5% SLO exposes the uniform-INT4 boundary").
  const tierOf = { FP16: 1, INT8: 1, B02: 1, B05: 3, INT4: 5 };
  const tierText = { B05: "B=0.5 opens at the ≤3% tier", INT4: "uniform INT4 opens at the ≤5% tier" };
  function candidates(model, eps, lk, tauRaw, mem) {
    const q = D.quality[model];
    const fp16T = R.fp16[lk];
    const tauAuto = tauRaw >= 260;
    const tau = tauAuto ? fp16T : tauRaw;
    const list = [
      { id: "FP16", name: "fp16 (no codec)", kind: "baseline", ratio: 1, dppl: 0 },
      { id: "INT8", name: "uniform INT8", kind: "a-posteriori", ...q.INT8 },
      { id: "B02", name: "certified B=0.2", kind: "certified", budget: 0.2, ...q.B02 },
      { id: "B05", name: "certified B=0.5", kind: "certified", budget: 0.5, ...q.B05 },
      { id: "INT4", name: "uniform INT4", kind: "a-posteriori", ...q.INT4 },
    ];
    for (const c of list) {
      c.bytes = (R.bytes[model] || {})[c.id] ?? Math.round(R.chunkKB / c.ratio);
      // latency
      if (c.id === "FP16") c.T = fp16T;
      else if (lk === "proxy") c.T = null, c.Tnote = "> 55";
      else if (c.id === "INT8") c.T = null, c.Tnote = "< 194";
      else if (c.id === "INT4") c.T = R.int4UniformUs;
      else c.T = R.tpath[model][c.id];
      // Q
      c.Q = c.dppl <= eps && tierOf[c.id] <= eps;
      c.Qnote = c.dppl > eps ? "ΔPPL above ε" : c.Q ? "" : tierText[c.id];
      // L
      if (c.T != null) c.L = c.T <= tau ? "ok" : "bad";
      else if (lk === "proxy") c.L = tauAuto ? "bad" : "unk";
      else c.L = tauAuto || tau >= fp16T ? "ok" : "unk"; // INT8 on PCIe beats fp16 (S* 1435 KB < 2 MiB)
      // M
      c.M = c.bytes <= mem;
      c.feasible = c.Q && c.L === "ok" && c.M;
    }
    return { list, tau, tauAuto, fp16T };
  }

  function drawResolver() {
    const model = $("rModel").value, eps = +$("rSlo").value, lk = $("rLink").value;
    const tauRaw = +$("rTau").value, mem = +$("rMem").value;
    const { list, tau, tauAuto, fp16T } = candidates(model, eps, lk, tauRaw, mem);
    $("rTauOut").textContent = tauAuto ? `auto: ≤ fp16 (${fp16T} µs)` : `${tau} µs`;
    $("rMemOut").textContent = mem >= R.chunkKB ? `${mem} KB (no limit)` : `${mem} KB`;

    const feas = list.filter((c) => c.feasible);
    const chosen = feas.reduce((a, c) => (!a || c.ratio > a.ratio ? c : a), null);
    const v = $("rVerdict");
    if (!chosen) {
      const known = list.filter((c) => c.T != null).sort((a, b) => a.T - b.T)[0];
      v.className = "verdict-card infeasible";
      v.innerHTML = `<div class="k">Resolver verdict</div><div class="v">Infeasible</div>
        <div class="why">No measured candidate meets (ε ≤ ${eps}%, τ ≤ ${tau} µs, M ≤ ${mem} KB). Lowest-latency candidate: ${known.name} at ${known.T} µs.</div>`;
    } else if (chosen.id === "FP16") {
      v.className = "verdict-card fp16";
      v.innerHTML = `<div class="k">Resolver verdict</div><div class="v">fp16: don’t compress</div>
        <div class="why">${lk === "proxy" ? "On the same-GPU path every compressed path has S* = ∞. Compression never pays here." : "No compressed candidate satisfies all three predicates, while fp16 does."} ${chosen.T} µs, ${chosen.bytes} KB.</div>`;
    } else {
      const dv = (R.delta[model] || {})[chosen.id];
      const d = lk === "pcie" && dv != null ? ` (${dv} µs vs fp16)` : "";
      v.className = "verdict-card";
      v.innerHTML = `<div class="k">Resolver verdict · ${model}, ΔPPL ≤ ${eps}%</div>
        <div class="v">${chosen.name} · ${chosen.ratio.toFixed(3)}×</div>
        <div class="why">${chosen.bytes} KB transported · ΔPPL +${chosen.dppl.toFixed(2)}% · T<sub>path</sub> ${chosen.T ?? chosen.Tnote} µs${d}.
        ${chosen.kind === "certified" ? "Every write carries the G2 per-write bound." : "A-posteriori point: measured ΔPPL is enforced, but there is <b>no per-write bound</b>."}</div>`;
    }

    const mark = (ok, note) => ok === "unk" ? `<span class="unk" title="${note || "not reported"}">?</span>` : ok === true || ok === "ok" ? `<span class="ok">✓</span>` : `<span class="bad" title="${note || ""}">✗</span>`;
    $("rTable").innerHTML = `<thead><tr><th>Candidate</th><th class="num">ratio</th><th class="num">ΔPPL</th><th class="num">bytes</th><th class="num">T<sub>path</sub> (µs)</th><th>Q</th><th>L</th><th>M</th></tr></thead><tbody>` +
      list.map((c) => `<tr class="${c === chosen ? "chosen" : ""}">
        <td>${c.name}<span class="tag">${c.kind}</span></td>
        <td class="num">${c.ratio.toFixed(3)}</td>
        <td class="num">${c.collapse || (c.id === "FP16" ? "—" : "+" + c.dppl.toFixed(2) + "%")}</td>
        <td class="num">${c.bytes} KB</td>
        <td class="num">${c.T ?? c.Tnote}</td>
        <td>${mark(c.Q, c.Qnote)}${c.Qnote && !c.Q ? ` <small class="fine">${c.Qnote}</small>` : ""}</td>
        <td>${mark(c.L)}</td>
        <td>${mark(c.M)}</td></tr>`).join("") + "</tbody>";
  }
  ["rModel", "rSlo", "rLink", "rTau", "rMem"].forEach((id) => $(id).addEventListener("input", drawResolver));
  const presets = {
    opt5: { rModel: "OPT-125M", rSlo: "5", rLink: "pcie", rTau: 260, rMem: 2048 },
    tiny700: { rModel: "TinyLlama-1.1B", rSlo: "3", rLink: "pcie", rTau: 260, rMem: 700 },
    proxy: { rModel: "Qwen2.5-3B", rSlo: "3", rLink: "proxy", rTau: 260, rMem: 2048 },
    tau: { rModel: "OPT-125M", rSlo: "5", rLink: "pcie", rTau: 125, rMem: 2048 },
  };
  document.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      for (const [k, v] of Object.entries(presets[b.dataset.preset])) $(k).value = v;
      drawResolver();
    })
  );

  // ── boot ───────────────────────────────────────────────────────────────
  function drawAll() {
    drawCrossover();
    drawMag();
  }
  drawMatrix();
  drawResolver();
  drawAll();
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(drawAll, 120); });

  // theme toggle
  const root = document.documentElement;
  const saved = localStorage.getItem("theme");
  if (saved) root.dataset.theme = saved;
  $("themeToggle").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("theme", root.dataset.theme);
  });

  // BibTeX copy
  $("copyBib").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("bibText").textContent);
      $("copyBib").textContent = "Copied";
      setTimeout(() => ($("copyBib").textContent = "Copy"), 1500);
    } catch { /* clipboard unavailable */ }
  });

  // KaTeX
  addEventListener("load", () => {
    if (window.renderMathInElement)
      renderMathInElement(document.body, { delimiters: [{ left: "$$", right: "$$", display: true }], throwOnError: false });
  });
})();

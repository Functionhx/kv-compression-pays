// Every number in this file is copied from the paper (section / table noted).
// Nothing here is fitted, extrapolated, or invented. If you edit a value,
// update the source note next to it.

window.PAPER = {
  // Sec. 4.6 — 192-cell grid, idle A100-SXM4-40GB, 64 KB–16 MB.
  // Crossover S*16 for dequantize-then-use paths on the PCIe leg (KB = KiB).
  grid: {
    measuredMinKB: 64,
    measuredMaxKB: 16 * 1024,
    pcie: [
      { path: "INT4 · g=128", crossKB: 1056 },
      { path: "INT4 · g=64", crossKB: 1398 },
      { path: "INT8 · g=128", crossKB: 1435 },
      { path: "INT8 · g=64", crossKB: 2081 },
      { path: "INT8-GEMM consumer", crossKB: Infinity },
    ],
    // Every compressed path on the same-GPU device-to-device proxy has S* = ∞.
    proxy: [
      { path: "INT4 · g=128", crossKB: Infinity },
      { path: "INT4 · g=64", crossKB: Infinity },
      { path: "INT8 · g=128", crossKB: Infinity },
      { path: "INT8 · g=64", crossKB: Infinity },
      { path: "INT8-GEMM consumer", crossKB: Infinity },
    ],
    codecAlphaUs: "53–92 µs",
    betaPcie: "42.6 ps/B (23.5 GB/s marginal)",
  },

  // Sec. 5.3 / Table 5 — two L40s, real PCIe P2P, TinyLlama-1.1B, fused Triton codec.
  // fp16 KV size per prefill: 512→11.5 MB, 1024→23 MB, 2048→46 MB, 4096→92 MB.
  p2p: {
    // certified B=0.2: codec+xfer still 2.1× fp16 xfer at 11.5 MB; crosses between 23 and 46 MB.
    measuredMinMB: 11.5,
    measuredMaxMB: 92,
    crossLoMB: 23,
    crossHiMB: 46,
    rows: [
      { tokens: 1024, mb: 23, fp16Xfer: 0.89, codec: 0.57, xfer: 0.39, e2eFp16: 2481, e2eCert: 2475 },
      { tokens: 2048, mb: 46, fp16Xfer: 1.76, codec: 0.69, xfer: 0.73, e2eFp16: 2533, e2eCert: 2564 },
      { tokens: 4096, mb: 92, fp16Xfer: 3.51, codec: 1.02, xfer: 1.42, e2eFp16: 3650, e2eCert: 3046 },
    ],
  },

  // Table 2 — WikiText-2 test, fixed 512-token windows, KV quantized at every layer.
  // dppl in percent; Qwen2.5-3B uniform INT4 is ΔPPL ≈ 12462× (stored as collapse:true).
  models: ["OPT-125M", "TinyLlama-1.1B", "Qwen2.5-3B"],
  quality: {
    "OPT-125M": {
      INT8: { ratio: 1.939, dppl: 0.0, err: 0.047 },
      B02: { ratio: 2.563, dppl: 0.7, err: 0.2 },
      B05: { ratio: 3.675, dppl: 2.15, err: 0.5 },
      INT4: { ratio: 3.765, dppl: 2.2, err: 0.839 },
    },
    "TinyLlama-1.1B": {
      INT8: { ratio: 1.939, dppl: 0.02, err: 0.109 },
      B02: { ratio: 2.549, dppl: 0.5, err: 0.2 },
      B05: { ratio: 2.604, dppl: 0.57, err: 0.5 },
      INT4: { ratio: 3.765, dppl: 9.41, err: 1.939 },
    },
    "Qwen2.5-3B": {
      INT8: { ratio: 1.939, dppl: 0.1, err: 0.38 },
      B02: { ratio: 2.195, dppl: 0.82, err: 0.2 },
      B05: { ratio: 2.742, dppl: 2.46, err: 0.5 },
      INT4: { ratio: 3.765, dppl: Infinity, collapse: "≈ 12462×", err: 6.75 },
    },
  },

  // Table 3 — resolver at S16 = 2 MiB fp16 chunk. Tpath in µs (grid cell + 27.6 µs certificate tax
  // for certified rows). fp16: 194 µs on PCIe, 55 µs on the same-GPU proxy.
  resolver: {
    chunkKB: 2048,
    fp16: { pcie: 194, proxy: 55 },
    certTaxUs: 27.6,
    tpath: {
      "OPT-125M": { B02: 160, B05: 158, INT4: 130 },
      "TinyLlama-1.1B": { B02: 160, B05: 160 },
      "Qwen2.5-3B": { B02: 159, B05: 160 },
    },
    // Difference vs the fp16 path as printed in Table 3 (computed by the paper from unrounded cells).
    delta: {
      "OPT-125M": { B02: -34, B05: -35, INT4: -64 },
      "TinyLlama-1.1B": { B02: -34, B05: -34 },
      "Qwen2.5-3B": { B02: -34, B05: -34 },
    },
    // Ledger-accurate transported bytes (KiB) exactly as printed in Table 3; others are 2048 / ratio.
    bytes: {
      "OPT-125M": { B02: 799, B05: 557, INT4: 544 },
      "TinyLlama-1.1B": { B02: 804, B05: 787 },
      "Qwen2.5-3B": { B02: 933, B05: 747 },
    },
    // Uniform INT4 at 544 KB lands in the same grid cell for every model (130 µs, reported for OPT-125M).
    int4UniformUs: 130,
    // INT8 · g=128 crosses at 1435 KB < 2 MiB, so it beats fp16 on PCIe, but its Tpath is not reported.
    int8CrossKB: 1435,
  },

  // Sec. 4.4 — worst-case per-block KV magnitude m* (INT4 error e4 = m/14).
  magnitude: [
    { model: "OPT-125M", m: 9.8 },
    { model: "TinyLlama-1.1B", m: 21.9 },
    { model: "Qwen2.5-3B", m: 92.8 },
    { model: "Qwen2.5-7B", m: 419 },
  ],
};

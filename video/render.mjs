// Render the explainer to MP4 (1920×1080, 30 fps) with headless Chrome + ffmpeg.
//   node render.mjs                      → ../static/video.mp4
//   node render.mjs --stills 3,12.5,40   → stills/t-<sec>.png for visual checks
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FPS = 30;
const OUT = path.join(here, "..", "static", "video.mp4");
const stillsArg = process.argv.indexOf("--stills");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "index.html")).href + "?render=1");
await page.evaluate(() => document.fonts.ready);
const total = await page.evaluate(() => window.VIDEO.total);
const shot = async (t, type = "png") => {
  await page.evaluate((x) => window.VIDEO.seek(x), t);
  return page.screenshot({ type, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
};

if (stillsArg > 0) {
  const dir = path.join(here, "stills");
  mkdirSync(dir, { recursive: true });
  for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(dir, `t-${t}.png`), await shot(t));
  }
  console.log(`total ${total.toFixed(2)} s; stills written to ${dir}`);
} else {
  mkdirSync(path.dirname(OUT), { recursive: true });
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.round(total * FPS);
  for (let i = 0; i < frames; i++) {
    const buf = await shot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log(`wrote ${OUT} (${frames} frames, ${total.toFixed(1)} s)`);
}
await browser.close();

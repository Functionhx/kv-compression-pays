# When Does KV Cache Compression Pay?

Project page for *When Does KV Cache Compression Pay? A Quality- and Cost-Aware Runtime Framework for Cloud LLM Serving* (GPC 2026).

**Live page:** https://functionhx.github.io/kv-compression-pays/

## Layout

- `index.html`, `assets/` — static page (no build step); interactive charts and the in-browser deployment resolver
- `static/` — paper PDF, explainer video, poster and social preview images
- `video/` — source of the explainer video (SVG timeline + headless-Chrome renderer)

## Preview locally

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

## Re-render the video

```bash
cd video && npm install
node render.mjs                     # writes ../static/video.mp4 (needs Chrome + ffmpeg)
open index.html                     # interactive preview with a scrubber
```

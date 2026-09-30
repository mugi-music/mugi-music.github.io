# mugi-music.github.io

Demo page for **Mugi** — Multi-task Song Generation with Joint Autoregressive-Diffusion Training and Cover-Oriented Tokenization.

## Deployment

This repository is a GitHub Pages **user/organization site** (`<user>.github.io`). It is served automatically from the root of the `main` branch at:

https://mugi-music.github.io/

No build step is required — it is a plain static site. The `.nojekyll` file disables Jekyll processing so the site is served as-is.

To update the site, edit the files and push to `main`:

```bash
git add .
git commit -m "Update demo page"
git push origin main
```

## Structure

- `index.html` — page layout and styles
- `demo-data.js` — per-task demo metadata (generated from the benchmark metadata; captions, lyrics, audio paths)
- `app.js` — renders the three task sections and the lazy-loading audio player
- `audio/` — MP3 clips organized as `audio/{task}/{case}/{model}.mp3`
  - `song/` — Lyrics-to-Song Generation (vs. HeartMuLa, LeVo2, MiniMax-Music3, ACE-Step-1.5, Suno v6)
  - `cover/` — Cover Song Generation (vs. SongEcho, ACE-Step-1.5, MiniMax-Cover; plus `reference.mp3` = original song)
  - `timbre/` — Timbre-controllable Song Generation (vs. LeVo2, ACE-Step-1.5; plus `reference.mp3` = voice prompt)

Each task has 10 cases (5 Chinese + 5 English), 150 MP3s total (~940 MB). Audio is only fetched when the user presses play (`new Audio()` on first click); no audio loads on page open.

## Editing demos

To add/remove cases or models, edit `demo-data.js` (a `window.DEMO_DATA` object: `models` list + `items` per task) and drop the matching MP3s under `audio/`. The page renders whatever the data contains.

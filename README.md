<div align="center">

# Paradise under Pressure

**A cinematic 3D globe that tells the story of Pacific island nations through tourism, ocean warming, emissions, natural disasters and renewable energy.**

[**Live demo**](https://sorassword.github.io/paradise-under-pressure/) · [Data sources](#data-sources) · [Run locally](#local-setup)

![Three.js](https://img.shields.io/badge/Three.js-r128-000?logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=black)
![No build step](https://img.shields.io/badge/build-none-2ea44f)
![Deploy](https://github.com/sorassword/paradise-under-pressure/actions/workflows/pages.yml/badge.svg)

<a href="https://sorassword.github.io/paradise-under-pressure/"><img width="560" alt="Paradise under Pressure, interactive 3D globe of the Pacific" src="https://github.com/user-attachments/assets/c83d3406-2334-4904-8fa4-96a1f769f537" /></a>

</div>

## About

Small island states in the Pacific depend on tourism, yet they emit almost nothing and are hit hardest by a warming ocean and more frequent disasters. **Paradise under Pressure** tells that story on an interactive globe: data layers are stacked act by act, so the viewer *feels* the contrast instead of reading a dashboard.

University project (HSD Düsseldorf) and competition submission. The goal is a story, not a dashboard.

## Features

- **Interactive 3D globe:** drag to rotate, scroll to zoom, click an island to focus the camera on it
- **Five data layers:** tourism (overnight visitors), sea-surface temperature anomaly, greenhouse-gas emissions, natural disasters, renewable energy
- **Timeline playback:** scrub or play through the years and watch the layers evolve
- **Five-act narrative:** each act adds one layer and one insight
- **No build step, no backend:** plain HTML/CSS/JS + Three.js from a CDN, data shipped as static JSON

## Tech stack

| Area | Choice |
|---|---|
| Rendering | Three.js r128 + OrbitControls (CDN, no bundler) |
| Frontend | Vanilla JavaScript, HTML, CSS |
| Data | Static JSON prepared from SPC tables |
| Hosting | GitHub Pages via GitHub Actions |

## Local setup

```bash
git clone https://github.com/sorassword/paradise-under-pressure.git
cd paradise-under-pressure/src
python -m http.server
```

Then open http://localhost:8000.

## Data sources

Pacific island statistics from the [SPC (Pacific Community)](https://spc.int).

## Project layout

```
src/               dress-rehearsal prototype (index.html, main.js, styles.css)
data/raw/          untouched source tables
data/processed/    cleaned data consumed by the visualization (paradise-data.json)
data/scripts/      planned Python/pandas data-prep pipeline
docs/              open questions / act notes
```

## Status / roadmap

- Current: single-file dress rehearsal extracted into `src/` (this repo).
- Planned: migration to Vite + React-Three-Fiber for a maintainable production build.
- Open: Act III needs a citable global per-capita emissions reference value (see `docs/act-notes.md`).

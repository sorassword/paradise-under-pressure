# Paradise under Pressure

A cinematic 3D-globe data visualization of Pacific island nations — tourism, ocean warming,
greenhouse-gas emissions, natural disasters, and renewable energy — told across a five-act
scroll narrative. University project (also a competition submission); the goal is a story,
not a dashboard.

![screenshot placeholder](docs/screenshot.png)

## Tech stack

- Three.js r128 (CDN, global namespace, no bundler)
- Vanilla JS / HTML / CSS
- Data: static JSON, no backend

## Local setup

```bash
cd src
python -m http.server
```

Then open `http://localhost:8000`.

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

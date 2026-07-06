# Reference: Google Data Arts Team — Arms Globe (2015, archived)

Repo analyzed locally (not vendored into this project): `https://github.com/dataarts/armsglobe`
(cloned to a throwaway `/tmp` path for read-only inspection, then deleted).

The codebase targets a Three.js r49-era API (`THREE.Geometry`, `THREE.ParticleSystem`,
`THREE.GeometryUtils.merge`, `THREE.ImageUtils.loadTexture`) that no longer exists in modern
Three.js. Nothing was copied verbatim — the techniques below were re-implemented from scratch
against Three.js r128 (`BufferGeometry`, `Sprite`/`TubeGeometry`, `Quaternion`), loaded as a
global `THREE` via the existing CDN `<script>` tag in [src/index.html](../src/index.html) (no
ES module imports).

| Technique in Arms Globe | Entsprechung in meinem Code | Übernehmen? |
|---|---|---|
| Flow-particles along great-circle-ish lines between country pairs (`getVisualizedMesh` in `js/visualize.js`: builds a `THREE.Geometry` line per trade edge, then a co-located `THREE.ParticleSystem` whose vertices `lerpSelf` between `path[moveIndex]` and `path[nextIndex]`, advancing `lerpN` each frame and wrapping index at path end) | Previously: no connection lines, only per-island point nodes (`src/main.js:145-151`) | Yes, adapted — see `addFlowLine()` below |
| Camera auto-rotates to face a selected country (`selectVisualization` in `js/visualize.js:345-373`: computes `rotateTargetX/Y` from lat/lon, and works around Euler-angle wrap-around with a `piCounter` loop trying `targetY0 ± 2π·n` until one is within `π` of the current rotation; `js/main.js:356-406` then damps `rotateVX/VY` toward the target every frame) | Previously: only auto-spin + manual drag (`src/main.js:155-163`), no click-to-focus | Yes, adapted — see `focusOnIsland()` below, using `THREE.Quaternion.slerp` instead of the Euler/`piCounter` hack |
| HTML marker overlay projected from 3D to 2D, scaled by an `importance` value (`attachMarkerToCountry` in `js/markers.js:13-60`: clones a template `<div>`, positions it via `setPosition(x,y,z)`, sizes text via `setSize(s)`) | Already present and confirmed equivalent: `n.el` label divs positioned in `update()` via `tmp.project(camera)` (`src/main.js:149`, `224-229`) | Already implemented, confirmed — no change needed |
| Precompute-once-then-filter architecture (`buildDataVizGeometries` builds every year's line geometry up front in `js/visualize.js:1-42`; `getVisualizedMesh` then only filters/merges per view instead of recomputing) | `value()`/`color()`/`size()` in each `ACTS` entry are evaluated live every frame per node (`src/main.js:198-233`) | Not adopted now — the current per-frame cost is O(islands) ≈ 21 nodes, cheap enough. Would become relevant if multiple flow-line layers or many more edges run simultaneously; noted for later. |

## Why these fit the "Paradise under pressure" story

- **Flow lines**: the piece's Act III ("The imbalance") already argues *least cause, greatest
  cost* — that the Pacific nations barely emit anything but bear the consequences. A static
  bar of per-capita numbers makes that argument statistically; a visible flow of particles
  arcing from the large historical emitters *toward* the islands makes it visceral and
  literal — the same "flow of consequence" framing Arms Globe used for weapons flowing between
  trade partners, repurposed here as a one-directional flow of responsibility rather than a
  bidirectional trade relationship.
- **Camera focus on click**: the narrative is largely about individual islands' fates (Tuvalu's
  fragility, Fiji's cyclones, Palau's aviation-driven emissions outlier). Letting a viewer click
  a lit node and have the globe glide to face it turns the piece from a passive animation into
  something explorable, without needing new UI chrome beyond the existing hover tooltip.

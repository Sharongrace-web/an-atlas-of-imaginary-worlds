# Tests

Node scripts used to verify the project. They are not needed to run the site.

Setup (in a separate working folder): `npm install three@0.128.0 pngjs gl@8.1.6` (the `gl` package renders frames on a software
WebGL context and needs `xvfb`, for example `xvfb-run -a node tests/render-test.js`). Several scripts read the project from
`/mnt/user-data/outputs/atlas-project/js/`; change that path at the top of a script if the project lives elsewhere.

| Script | What it checks |
|---|---|
| `render-test.js` | Renders a world through real WebGL; reports GL errors; options WORLD, SEED, Q (quality tier), DENS (particle density), YAW, PITCH, DIST, CENTER, T0 |
| `flow-test.js` | Navigation, settings, panels, Keep, Collection, with storage available, blocked and full |
| `seed-test.js`, `seed-sweep.js`, `variation-sweep.js` | Same seed gives the same world; many seeds build without errors; compositions and Generate Variation |
| `variation-metric.js`, `contact-sheet.js`, `find-seeds.js` | Contact sheets and a measure of how different the compositions are |
| `stones-test.js`, `particle-size-test.js` | Dune standing-stone proportions; particle sizes at the default camera |
| `tidal-mirror-verify.js`, `image-diff.js`, `mask-subset-check.js` | The Tidal Archive reflection fix, checked pixel by pixel |
| `placement-verify.js`, `placement-animation-check.js`, `placement-moves.js`, `version-compare.js` | Dune formations do not intersect; before/after comparison of worlds |

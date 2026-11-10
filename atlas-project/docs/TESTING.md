# Testing notes

## How testing was done (updated)
Since the composition pass the project also has a **real-renderer test**: worlds are rendered through Three.js on a software WebGL context, the frame is read back, GL errors are collected, and the image can be inspected. This is what exposed the Blooming Silence bug. Run with `xvfb-run -a node tests/render-test.js` (needs `three@0.128.0`, `gl` and `pngjs` from npm; environment variables WORLD, SEED, Q choose the case). The older logic tests (`tests/flow-test.js`, `tests/seed-test.js`, `tests/seed-sweep.js`) still run under plain Node.


The build environment has no visible browser. Tests ran the real project scripts under Node against the real Three.js r128, with a stubbed browser (a simulated clock, timers, DOM and storage). They test logic, geometry construction and navigation, not appearance.

## Automated checks and results
| Check | Result |
|---|---|
| Syntax of all scripts | Pass |
| Seeds: same seed builds identical geometry twice; a different seed differs (3 worlds, desktop and mobile tier) | Pass |
| Build time (Node, desktop tier): about 90 to 340 ms per world; mobile tier about 30 to 60 ms | Recorded |
| Size (desktop tier): about 44k to 86k vertices per world; mobile tier 18k to 53k | Recorded |
| Navigation: intro, Atlas, enter each world, back to Atlas, back to intro | Pass |
| Generate variation from each world (new seed, sliders kept) | Pass |
| Settings: extreme values for all four sliders, reset to neutral | Pass |
| Panels: open one, switch to the other, close; closed on leaving a world | Pass |
| Keep (three worlds, plus variations): collection grows, state stays in world | Pass |
| Collection: open from Atlas and from a world, close back to where it came from, reopen a kept world from each | Pass |
| Storage blocked (throwing localStorage): keeps work for the visit, no errors | Pass |
| Storage full (writes refused): retry without picture, no errors | Pass (retry path only) |
| Portrait resize (390 by 800) then Atlas, world, keep, panel | Pass |
| Escape: closes a panel first, then leaves the world | Pass |
| Camera values stay finite throughout | Pass |

## Final refinement pass: additional checks
| Check | Result |
|---|---|
| All earlier navigation, settings, keep, collection and storage tests re-run on the refined worlds | Pass |
| Seeds: same seed identical, different seed differs (3 worlds, desktop and mobile tiers) | Pass |
| Non-finite values in positions, normals and instance matrices (3 worlds, 3 seeds, after animation) | None found |
| Dune formation proportions (bounding boxes): about 11 to 20 wide, 2 to 4 tall, 17 to 33 long | Thin and elongated as intended |
| Build time (Node): Tidal about 450 ms, Blooming about 115 ms, Dunes about 350 ms on desktop tier; 65 to 140 ms on mobile tier | Recorded |
| Vertex counts: Tidal about 218k drawn on desktop (includes the mirrored copies), 75k mobile; Blooming 57k and 49k; Dunes 107k and 35k | Recorded |

## Composition pass: additional checks
| Check | Result |
|---|---|
| Real-renderer frames: 9 world, seed and tier combinations (desktop and mobile tiers) | 0 GL errors; geometry visible in every frame |
| Blooming Silence default seed rendered and inspected | Flowers, stems and leaves visible; hero bloom is the focal point |
| Settings path in the real renderer: structure scale, warm tint, particle draw range, doubled fog | 0 GL errors |
| Visual inspection of rendered frames for all three worlds | Reviewed; brightness and shape issues found were corrected (over-bright sea and petals, black falling petals, spiky dunes, gap in the great arch) |
| Navigation, settings, panels, Keep, Collection, storage blocked and full | Pass |
| Seeds: identical rebuilds, different seeds differ; 40 Blooming Silence seed builds without error | Pass |
| Build time: Tidal about 310 ms, Blooming about 150 ms, Dunes about 250 ms (desktop tier, Node) | Recorded |

## Suspended Dunes: particles and standing stones
| Check | Result |
|---|---|
| Particle audit at the default camera (counts, sizes, distances) | Found the cause: 0.2 to 1 px points, additive blending, oversized volume |
| Particles in a real-renderer frame (800 by 500), seed 3041, pixels changed compared with density 0 | Before: about 760 px. After: about 4,200 px at density 100 percent, about 2,100 at 50, 0 at 0 |
| Same measurement, seeds 8 and 4711 | About 3,700 and 4,000 px at 100 percent; about half at 50 percent |
| Mobile tier (seed 3041) | About 2,500 px at 100 percent; no GL errors |
| Visual inspection of the rendered frames | Fine grains visible across the scene; faint dust; not noisy |
| Standing stones: 1,200 stones over 120 builds (60 seeds, both tiers) | All proportions within limits; no box geometry in the world |
| Close-up render of the stone cluster | Reads as weathered standing stones with broken tops, not poles |
| Other worlds re-rendered in the real renderer after the shared particle change (4 cases) | 0 GL errors |
| Navigation, settings, Keep, Collection, storage blocked and full; seeds; geometry; 40-seed Blooming sweep | Pass |

New test files: `tests/stones-test.js`, `tests/particle-size-test.js`. `tests/render-test.js` now accepts DENS (particle density) and CENTER (camera target) so frames can be compared.

## Particle rebuild and seed variation
Contact sheets (five compositions per world, rendered through the real renderer at each world's own opening camera) are in `docs/contact-sheets/`.

| Check | Result |
|---|---|
| Five compositions per world rendered and inspected side by side | All 15 look clearly different (see contact sheets) |
| Pixels clearly different between compositions (mean over all 10 pairs, 640 by 400 frames) | Tidal 40.7 percent, Blooming 36.3 percent, Dunes 36.7 percent. Least different pair: 31.7, 30.1 and 27.1 percent |
| Particle density 0, 50 and 100 percent, pixels covered by particles at 800 by 500 | Dunes 0 / 7,909 / 15,237 (3.8 percent of frame; was about 760 pixels in the previous version). Tidal 0 / 1,594 / 3,025. Blooming 0 / 1,946 / 4,268 |
| Particle motion: change between frames 0.6 s apart | Dunes change 14.9 percent of the frame with no particles (scene drift) and 21.6 percent with particles, so grains visibly move |
| Visual inspection of rendered frames | Grains and dust read clearly in all three worlds and are not noisy at 100 percent; dune grains remain visible on bright and darker areas |
| Mobile tier (counts about 60 percent): all 15 compositions rendered | 0 GL errors; 19k to 128k triangles per frame, 49 to 83 draw calls |
| 300 builds (50 seeds per world, both tiers): exceptions, non-finite values | None |
| Same seed rebuilds identical geometry (36 checks) | 36 of 36 |
| Generate Variation lands on a different composition | 0 failures in 600 trials |
| Compositions occurring across 50 seeds | All five appear in every world |
| Build time, slowest of 50 seeds, desktop tier in Node | Tidal 363 ms, Blooming 189 ms, Dunes 294 ms |
| Standing stones, 1,509 stones in 120 builds (limits: height to width at most 2.4, height at most 4.0, width at least 0.65) | 0 violations |
| Navigation, settings, Keep, Collection, storage blocked and full | Pass |

Test files added or updated in `tests/`: `variation-sweep.js`, `contact-sheet.js`, `variation-metric.js`, `find-seeds.js`, `stones-test.js`, `render-test.js` (now draws a sky gradient and supports T0 for time offsets).

A note on the reproducibility test: geometry must be compared before calling the world's update, because the Tidal Archive's sea mesh is intentionally animated.

## Tidal Archive: removal of the ghostly mountain
Before and after renders of all five compositions (same seeds, camera and time) are in `docs/contact-sheets/tidal-archive-mountain-removed-before-after.png` (top row before, bottom row after).

| Check | Result |
|---|---|
| Cause located by listing mirrored groups and their vertical extent | Central island mirror spanned about 19 below to 6.8 to 11 above the sea; satellite mirrors stayed at or below sea level |
| Pixel comparison, five compositions, 800 by 500, before and after | 2.8 to 12.5 percent of the frame changed, all in one mountain-shaped region around the central island |
| The removed geometry rendered alone as a mask; changed pixels outside the mask (2 px tolerance) | 0 in all five compositions |
| Geometry compared before and after over 80 seeds (all five compositions), everything except the central island mirror | 80 of 80 identical (library, arches, islands, satellites, sea, particles, pages, lenses) |
| Highest point of the central island mirror above the sea over 80 seeds | 0.25 units (the island's own bobbing); before the fix several units |
| Mobile tier (no mirrors) | Unaffected |
| GL errors in the five renders | 0 |

Tests: `tests/tidal-mirror-verify.js`, `tests/image-diff.js`, `tests/mask-subset-check.js`.

## Suspended Dunes: overlapping formations
Before and after renders of the reported seed (278376) from three camera angles are in `docs/contact-sheets/dunes-procession-overlap-before-after.png` (top row before, bottom row after).

| Check | Result |
|---|---|
| Cause located in the placement code | Procession skipped the overlap check; other compositions used a weak check |
| Independent intersection test (rays cast through the real meshes, rotations and tilt included), 124 builds (about 12 seeds per composition, both tiers) | Before: 161 intersecting pairs (Procession in every seed). After: 0 |
| Reported seed 278376 | Before: 6 intersecting pairs. After: 0 |
| Intersections while the formations bob and turn (22 builds, checked at 0, 60 and 180 simulated seconds) | 0, 0 and 0. A wider sample of 42 builds had one brief graze at 180 s (Star dune, seed 19) |
| Formation geometry, rotation, streams and stones before vs after (144 builds, 1,653 formations, both tiers) | Identical in all builds; only positions changed |
| Formations moved (about 20 seeds per composition, desktop) | Procession 123 of 280, Dune sea 28 of 315, Star dune 26 of 280, Crescents 34 of 300, Scatter 10 of 360 |
| Default seeds from the earlier contact sheet: formations moved | Dune sea 4, Procession 6, Star dune 1, Crescents 1, Scatter 0 |
| The Tidal Archive and The Blooming Silence before vs after (25 seeds, both tiers) | Identical in all 50 builds each |
| Tidal Archive mountain correction | Still in place: the central mirror's highest point is 0.25 units above the sea (60 seeds) |
| Real renderer, five dune compositions, desktop and mobile tiers | 0 GL errors; 120k to 164k triangles desktop, 20k to 44k mobile |
| Build time (slowest of 50 seeds, desktop, Node) | Dunes 387 ms (was about 294 ms) because of the placement search |
| Navigation, settings, Keep, Collection, storage blocked and full, standing stones, 300-build sweep | Pass |

Tests: `tests/placement-verify.js`, `tests/placement-animation-check.js`, `tests/version-compare.js`, `tests/placement-moves.js`.

## Not tested here (needs a person in a browser)
- Shader compilation and exact appearance on real GPUs, including the new shadows, Phong sea and instance colours.
- Whether the camera-anchored particle layers look right while orbiting on real hardware (frames were checked from the default camera).
- Whether the Tidal Archive's mirrored islands, the sea's foam and the dunes' shadows look right and perform well.
- Frame rates on real phones and low-end laptops.
- Drag, wheel and pinch feel; hover feel.
- Thumbnail capture from a real WebGL canvas.
- Real localStorage quota behaviour; private-browsing modes.
- Screen readers and keyboard-only use beyond focus styles.

## Manual checklist for the visitor
1. Intro reveal, Explore, orb hover and click, Return.
2. In each world: drag, scroll or pinch, drift, all four sliders, Generate variation, Reset.
3. Field notes: opens, scrolls on a phone, shows kept count.
4. Keep a world twice with different sliders; open Collection; reopen both; remove one.
5. Resize to a phone width; check the bottom toolbar and panels.
6. Reload the page and confirm the Collection persists.

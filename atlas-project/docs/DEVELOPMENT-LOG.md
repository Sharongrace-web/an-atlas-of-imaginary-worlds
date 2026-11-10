# Development log

| Phase | What was done | Notes |
|---|---|---|
| 0 | Project structure, shared renderer, sky dome, visual tokens, performance setup, docs | One shared clock for all shaders |
| 1 | Cinematic intro (letter-by-letter title, point-cloud knot), Atlas with three orbs, hover records, enter transition, responsive layout | Touch: first tap reads, second tap enters |
| 2 to 4 | Three procedural worlds, seed system, orbit camera, veil and title-card transition, New variation | Worlds are built behind an opaque veil |
| 5 | Control panel (fog, scale, particles, mood), Generate variation, Reset | Settings are live; only a new seed rebuilds |
| 6 | Field notes panel with observations, method, seed and kept count | Text lives in `js/worlds.js` for later AI notes |
| 7 | Keep and Collection with thumbnails, storage fallbacks, reopen and remove | Storage blocked: session-only with a message |
| 8 | Visual refinement of all worlds, polish, navigation checks, documentation | See `creative-experiments.md` |
| 9 | Final visual pass: eroded islands, ancient architecture, multi-wave sea with mirrors and highlights, smooth varied petals, tapered stems with leaves, restrained pollen, thin elongated dunes with shadows and sand curtains | Interface and settings untouched; seeds still deterministic |
| 10 | Found and fixed the renderer error that stopped the Blooming Silence drawing; recomposed all three worlds around focal points | Verified with software-GL renders |
| 11 | Dunes: made particles visible and replaced the thin sticks with designed standing stones | Verified with real-renderer pixel comparisons and 120-build proportion checks |
| 12 | Rebuilt the particle system (camera-anchored layers, clamped sizes, crisp discs, wind gusts) and added five seed-chosen compositions per world | Verified with contact sheets, density measurements and 300-build sweeps |
| 13 | Tidal Archive: removed the ghostly mountain behind the central library by cutting its island's reflection at the waterline | Verified pixel by pixel and over 80 seeds |
| 14 | Dunes: placement safety so formations no longer intersect | Verified with independent ray tests, 144 before/after comparisons and renders |

## Notable decisions and fixes
- Moved from placeholder arrival screen to a title card shown over the veil while the world builds.
- Replaced one-size-fits-all petals with three species, two variants per layer and per-petal jitter, still using instancing.
- Dune ripples needed a denser polar grid; slope lighting did more for readability than any extra geometry.
- Sea normals are now recomputed (every second frame) so the waves are shaded.
- Thumbnail capture moved into the frame loop because the canvas is blank outside the draw call.
- Escape now closes a panel first, then leaves the world.
- Dune formations were redesigned from bowl-like slabs to thin teardrop sheets with a shared wind direction.
- The sea now draws mirrored islands first and itself second (render order), so reflections show through without a second render pass.
- Ripples stayed as geometry because per-vertex Lambert lighting cannot show normal-map ripples.
- The Blooming Silence failed in the browser because instanced meshes sharing a material did not all have instance colours. Node tests missed it; a real-GL render test now guards it.
- Dunes were rebuilt a third time: from ribbed slabs to broad lobed bodies, after viewing real renders.
- Particles on a light background need normal blending and a minimum pixel size; additive glow only works on dark backgrounds.
- Particles: investigation showed the problem was effective size, fixed volumes and contrast, not count.
- Variation: a new seed now selects a composition first, so Generate Variation is always a visible change.
- Dune height gets a soft cap after the first star-dune render produced a cone.
- Dune placement: the first attempt used one margin for both deciding to move and choosing where; it moved about 20 percent of formations. A two-level test (tight trigger, safer target) cut that to 3 to 11 percent outside the Procession.

# An Atlas of Imaginary Worlds

An immersive, browser-based 3D exhibition of three imaginary environments, built with plain HTML, CSS, JavaScript and Three.js (r128, loaded from cdnjs). All visuals are generated in code: no images, models or textures.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Project structure, shared renderer, visual system, performance setup, docs | Done |
| 1 | Cinematic intro, Atlas with three orbs, hover records, enter transition, responsive layout | Done |
| 2 | The Tidal Archive (refined in Phase 8) | Done |
| 3 | The Blooming Silence | Done |
| 4 | The Suspended Dunes | Done |
| 5 | Experimentation panel and seeded variations | Done |
| 6 | Field-note panels (AI-written notes later) | Done |
| 7 | Keep and Collection | Done |
| 8 | Polish, performance pass, final docs | Done |
| 9 | Final visual refinement of all three worlds | Done |
| 10 | Composition and identity pass; fix for the Blooming Silence not drawing | Done |
| 11 | Dunes: visible particles and designed standing stones | Done |
| 12 | Rebuilt particles; five compositions per world | Done |
| 13 | Tidal Archive: removed the ghostly reflection mountain | Done |
| 14 | Dunes: formations no longer intersect | Done |

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure: canvas, intro, Atlas, record panel, arrival screen |
| `style.css` | Visual system (colour and type tokens), layouts, reveal animations, responsive rules |
| `js/worlds.js` | World data: ID, coordinates, discovery status, poetic description, method, colours |
| `js/worlds3d.js` | The three procedural environments. `WORLD3D.build(index, seed, env)` returns the world's group, update function, camera settings, fog and sky |
| `js/script.js` | Renderer, sky, particles, intro structure, orbs, interaction, transitions, animation loop |
| `build.py` | Bundles everything into one `atlas.html` for publishing |
| `docs/` | `TECHNICAL.md`, `DEVELOPMENT-LOG.md`, `TESTING.md`, `REFLECTION.md` |
| `tests/` | Node tests: real-renderer frames (`render-test.js`), navigation and storage (`flow-test.js`), seeds |
| `creative-experiments.md` | Visual experiments, techniques, alternatives, design decisions |

## The worlds

| ID | World | Planned technique |
|---|---|---|
| AW-001 | The Tidal Archive | Noise-displaced terrain and procedural architecture |
| AW-002 | The Blooming Silence | Parametric geometry and procedural botanical growth |
| AW-003 | The Suspended Dunes | Mathematical wave functions and layered terrain |

## How the experience flows

1. **Intro:** the title reveals letter by letter over a slowly rotating point-cloud knot. **Explore** opens the Atlas.
2. **Atlas:** three orbs appear one after another. Hovering (mouse) or tapping (touch) shows the world's field record. Clicking or tapping again enters it.
3. **Enter:** the camera glides into the orb, the screen fades to a veil in the world's colours, the world is built behind it, a title card appears, and the veil lifts while the camera flies in.
4. **Explore:** drag to orbit, scroll or pinch to zoom. The camera also drifts slowly on its own.
5. **Adjust:** sliders for fog density, structure scale, particle density and colour mood, live. **Generate variation** rebuilds the world from a fresh random seed and keeps the sliders. **Reset** restores the defaults.
6. **Field notes:** name, ID, coordinates, discovery status, description, three observations, the method and seed, and how many variations of that world have been kept.
7. **Keep this world:** saves the world index, seed, slider values and a thumbnail to browser storage (up to 24).
8. **Collection:** reachable from the Atlas and from inside a world. Click a card to reopen that exact world; Remove deletes it. If storage is blocked, kept worlds last for the visit only and the screen says so.
9. **Return to the Atlas** (or Esc) fades back. Esc closes an open panel first.

## Seeds

Each world is built from one number. The same seed always rebuilds the same world (checked by comparing geometry between builds). Defaults are 1013, 2027 and 3041. The current seed is shown in the world; Generate variation picks a new seed that gives a different composition (each world has five), and kept worlds store their seed. All generation uses the seeded generator in `worlds3d.js`, never `Math.random`.

## Mobile tier

On touch devices and narrow screens, `Q = 0.6` reduces particle counts, sphere and grid resolution and sea size. Pixel ratio is capped at 1.75 and drops automatically on slow frames. Worlds are disposed when you leave them, so only one is in memory at a time.

## Performance choices

- Pixel ratio capped at 1.75, and lowered automatically if the average frame time stays slow.
- Particles are animated in the vertex shader (no per-frame JavaScript per particle). Reduced-motion users get fewer particles and slower time.
- One shared clock and one renderer for every scene. No external textures or models.

## Testing done so far

- Syntax check of all scripts.
- Seed test: each world built twice with one seed is identical, and differs with another seed (desktop and mobile tiers).
- See `docs/TESTING.md` for the full list, results and what could not be tested.
- Smoke test: the real script ran against Three.js r128 with a stubbed browser through intro, Atlas, entering each world, a new variation, leaving, and a portrait resize, with no errors and sensible camera positions.
- Not testable here: shader compilation on a real GPU, how it actually looks, drag and hover feel, and real-device frame rates. These need a human in a browser.

## Rebuilding

Edit the source files, run `python3 build.py`, and publish `atlas.html`. Constraint: a published page is one self-contained file, so the source files are inlined at build time. Three.js is loaded from cdnjs and fonts from Google Fonts.

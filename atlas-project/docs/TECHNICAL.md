# Technical documentation

## Stack and constraints
- Plain HTML, CSS and JavaScript; Three.js r128 (UMD, cdnjs); Cormorant Garamond and Jost from Google Fonts with fallbacks.
- Published as one self-contained HTML file built by `build.py`. No images, models or textures; everything is drawn in code.
- Runs on WebGL 1. No post-processing.

## Files
| File | Role |
|---|---|
| `index.html` | Canvas, veil, five screens (intro, atlas, arrival, hud, collection), flash and toast |
| `style.css` | Tokens, screens, panels, sliders, collection grid, responsive rules |
| `js/worlds.js` | Data: ID, coordinates, status, description, observations, method, colours |
| `js/worlds3d.js` | Seeded noise, mesh tools, motes, and the three builders |
| `js/script.js` | Renderer, sky, intro, orbs, state machine, camera, settings, panels, storage, collection |

## State machine
`body[data-state]` drives which screen is visible (CSS) and what the loop does (JS).

`intro` to `atlas` to `entering` to `arrival` to `world`; `world` to `leaving` to `atlas`; `world` to `regen` to `world`; `atlas` or `world` to `collection` and back; `collection` to `entering` to `arrival` to `world` (opening a kept world).

Timed steps use `later(fn, ms)`, which is cancelled whenever another transition starts (`tid` counter), so quick clicks cannot cross wires.

## Renderer and performance
- One renderer, scene and camera. Pixel ratio capped (1.75, or 1.5 on touch) and lowered by 0.25 steps if the average of 90 frames exceeds 27 ms.
- `Q = 0.6` on touch devices and narrow screens: fewer particles, lower mesh resolution, a smaller sea.
- Merged meshes and instancing keep draw calls low (about 40 to 60 objects per world, many of them small point systems).
- Particle motion is computed in the vertex shader from a shared clock.
- A world is disposed (geometries and materials) when left; only one world exists at a time. Shared sprite texture is not disposed.
- Reduced motion: slower clock, fewer ambient particles, no parallax.

## World builder contract
`WORLD3D.build(index, seed, env)` returns `{ group, update(t, dt), cam, fog, sky, setScale(v) }`. `env` holds the shared clock, sprite texture, pixel-ratio uniform and quality number. Settings are applied by `applySettings` in `script.js`, which walks the group: materials and lights keep a stored base colour and are multiplied by the mood tint; point systems that have a `uBox` uniform get a draw range for particle density; fog density and colour are set on the scene; `setScale` is world-specific.

## Shadows and reflections
The renderer enables the shadow map once, but only a light that sets `castShadow` uses it. Only the Suspended Dunes' sun does, on the desktop tier (1024 map, soft PCF). The Tidal Archive draws mirrored copies of its islands (sharing geometry) below the sea with a lower render order than the sea, which is transparent and does not write depth. Mirrors are skipped on the mobile tier.

## Particle system
`motes()` in `js/worlds3d.js` builds a Points object with a custom shader. Options: `anchor` (wrap the volume around the camera using the built-in `cameraPosition` uniform and the view matrix), `normal` (normal instead of additive blending), `soft` (glow disc), `min` / `max` pixel size, and `k` (distance scaling reference; 0 keeps a constant pixel size). Motion is computed in the vertex shader: position plus velocity times time times a per-particle speed, wrapped with `mod` inside a box, plus gusts and turbulence. Edge fade and near-lens fade are also in the shader. Camera-anchored layers need an identity object transform. The density slider calls `setDrawRange` on every Points object that has a `uBox` uniform.

## Composition archetypes
`WORLD3D.archetype(index, seed)` returns 0 to 4 from a hash of the seed, independent of the world's main random stream; default seeds return 0. Each builder reads it first and returns a `label` (shown in the HUD). Generate Variation draws random seeds until the archetype differs from the current one. `WORLD3D.ARCH_NAMES` lists the names.

## Dune placement safety
In `dunes()`, each formation first gets its position exactly as before (including the original rejection loop, which keeps using the original positions so the random stream and every shape are unchanged). Then `relocate()` tests it against the final positions of earlier formations with `clashes()`: for sample points over its outline it compares the underside and top of both formations (`span()` reads them from the vertex grid) with a vertical margin that includes a tilt allowance. If it clashes, the nearest clear candidate from a fixed, sorted list of offsets (along the path, vertical, spiral) is used. Constants are in `PLACE`. `world.stats.layout` exposes the final layout for tests.

## Rule: instanced meshes and shared materials
In this version of Three.js, an InstancedMesh with per-instance colours must not share a material with instanced meshes that have none: the renderer throws every frame. In the Blooming Silence every instanced mesh is given an instance colour when it is created.

## Camera
World camera is an orbit (yaw, pitch, distance) around a centre. It drifts by itself, follows drag, wheel and a two-pointer pinch, and eases in from far away on entry. Distance and pitch are clamped per world. Each world can set an opening yaw (`cam.yaw0`) so it opens on its composed view.

## Persistence
Key `atlas-imaginary-worlds/v1`: a JSON array of `{ id, w, seed, s: {fog, scale, particles, mood}, t, thumb }`. Loaded entries are validated; settings are clamped on reopening. Thumbnails are 320 px wide JPEG data URLs, only accepted if they start with the expected prefix.

## Accessibility
Orb labels and all controls are real buttons with focus styles and labels; sliders are native range inputs; toast is a live region; Esc closes panels, the Collection and worlds.

## Known technical limits
- Shaders could not be compiled in the build environment; they follow the same patterns as shaders already confirmed to work.
- The mood tint does not recolour particles.
- The Tidal Archive on desktop draws about 218k vertices including mirrors; weaker GPUs may prefer the mobile tier.
- Changing structure scale in the Blooming Silence does not scale stems.

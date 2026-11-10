# Creative experiments

A running record of visual experiments, procedural techniques, alternatives considered and design decisions.

## Phase 1 experiments

### 01. Intro structure as a point cloud
- **Technique:** a torus knot geometry drawn as points, not a surface. A custom shader breathes each point along its normal, shifts colour (lavender, cyan, pink) by position and time, and twinkles.
- **Why:** points read as light rather than object, which keeps it dreamlike and cheap (about 4,300 points).
- **Alternatives considered:** a solid glass-like knot (needs lighting and environment maps, heavier); a wireframe knot (too diagrammatic). Two faint icosahedron cages were added for scale and structure.

### 02. Orbs as lenses of light
- **Technique:** a fresnel (rim) glow, slow drifting colour bands from sine waves, a code-drawn radial sprite halo, and a thin ring of orbiting motes.
- **Why:** each orb hints at its world's palette without previewing the world.
- **Alternatives considered:** textured planets (needs assets); full volumetric glow (too heavy).

### 03. Sky dome with dithering
- **Technique:** a gradient sphere that follows the camera, a soft horizon glow, and a hash-based dither to stop colour banding in dark gradients.
- **Why:** the sky's colours are the main carrier of mood and are what change during transitions.

### 04. GPU-animated particles
- **Technique:** about 620 points whose drift, sway and twinkle are all computed in the vertex shader from a shared clock and a per-point seed.
- **Why:** the cheapest way to get constant gentle motion.

## Phase 2 to 4 experiments: the three worlds (refined in Phase 8)

### Shared toolkit
- **Seeded everything:** a seeded random generator plus value noise and layered noise (fbm). A world is fully described by its seed. Nothing in a world uses `Math.random`.
- **Mesh merging:** a helper collects many shapes into one vertex-coloured mesh, so a whole island of arches and books is one draw call.
- **GPU motes:** one particle shader wraps points inside a box and moves them along a velocity. It makes rising bubbles, pollen, blowing sand, falling sand and waterfalls of light; only the box, velocity, colours and size change.
- **Fog and haze:** exponential fog plus large drifting additive sprites, at several heights.
- **Mobile tier:** one quality number (0.6) scales particle counts and mesh resolution.

### World 001, The Tidal Archive: noise-displaced terrain and procedural architecture
- **Terrain, first version:** a sphere pushed by layered noise. **Refined:** the noise coordinates are warped by a second noise (so shapes stop looking blobby), tops are partly quantised into soft terraces, and the underside is stretched by ridged noise (the absolute value of noise, inverted) into rocky spines. Boulders sit on the tops.
- **Architecture, first version:** arches from blocks, bookcases, columns. **Refined:** every structure now stands on a two-step plinth; arches have bases, capitals and a keystone; an arcade is a front row, a shorter back row offset half a bay, and a cornice beam (depth from layering); columns have bases, capitals and a round platform.
- **Water:** the sea is still sine waves plus noise, but now its vertex colours go from deep blue to pale crests, and normals are recomputed every second frame, so waves are shaded. Thin shimmer motes skim the surface. Falling droplets form waterfalls of light from island rims.
- **Mist and details:** two haze layers (low and mid height); drifting debris of broken stones, masonry and loose pages as one slowly rotating mesh.
- **Alternatives considered:** a shader-based sea (nicer reflections, more risk); modelled books (needs assets).

### World 002, The Blooming Silence: parametric geometry and procedural botanical growth
- **Petal surface:** a spine whose angle grows toward the tip, a sine width profile, and edges pushed inward to cup. **Refined:** added a ruffled edge, sideways asymmetry, a recurved tip, and a darker midrib in the vertex colours.
- **Three species:** star (long, open, recurved), bell (broad, cupped, nearly closed) and layered lotus (many short petals). Each species has three layers of petals and its own colour ramp.
- **Variety without cost:** every layer has two petal variants (smooth and ruffled), and each petal gets its own size and hinge jitter from the seed. All petals of a species and layer share instanced meshes, and the instance count is set every frame.
- **Scale and depth:** one giant centre bloom, mid-sized blooms, small distant blooms in the fog, and closed buds. Some hang like bells, some rise. Single petals fall slowly through the scene.
- **Breathing:** only the petal hinge angle changes each frame, with a phase delay per layer.
- **Alternatives considered:** recursive branching plants (harder to keep readable); morphing meshes each frame (too costly).

### World 003, The Suspended Dunes: mathematical wave functions and layered terrain
- **Height function, first version:** one skewed sine wave plus ripples. **Refined:** two skewed-wave sets at an angle, with the wave phase warped by low-frequency noise so crests meander, plus a broad noise layer.
- **Visible ripples:** a fine ripple wave is added to the height (real small geometry) and also tints vertices. The polar grid is now much denser (about 112 by 52 on desktop).
- **Slope lighting:** the slope along the wind direction is measured by sampling the height function twice. Windward faces get lighter, lee faces darker. This is what makes dunes read as dunes.
- **Layered terrain:** the underside tapers to a point with banded strata and a noise wobble.
- **Sand:** each of the larger slabs has up to three dense streams falling from the underside; a faster, low sheet of grains blows sideways above the slabs; ambient grains drift.
- **Alternatives considered:** displacing a flat plane (looked like a tile); animating dune crests (costly, little payoff).

## Suspended Dunes: overlapping formations (placement correction)

**What was wrong:** some variations placed dune formations on top of, or through, each other (the Procession in particular). Two causes, both in the placement code:
1. The Procession composition returned its path position before any overlap check ran, and the path spacing (about 9 units) was smaller than the formations' sizes (radius 4 to 13).
2. The check used for the other compositions compared nominal radii only, treated anything more than 4 units apart vertically as clear (regardless of a dune's height or thickness), and after 16 failed tries it accepted the last attempt anyway.
Measured with an independent test (rays cast through the real meshes), the old version had intersecting formations in every Procession seed (65 pairs in 26 builds) and in a minority of seeds in each of the other compositions: 161 intersecting pairs across 124 builds. The seed in the report (278376) had 6.

**The fix:** a placement-safety step after each formation's position is chosen. It tests the formation's real surface (the top and underside at every point of its outline, not a circle) against every earlier formation, including a small allowance for their random tilt. If there is no intersection, the position is left exactly as it was. If there is one, the formation moves to the nearest clear spot, searching along the procession path first, then straight up or down, then in an outward spiral. A formation moved this way must be clear by 0.6 units vertically, and its neighbour is also tested turned by up to 0.25 radians, because the formations rotate slowly. Candidate positions come from a fixed list, never from the random stream, so every dune keeps exactly its shape, rotation, streams and stones. The Procession is checked more strictly (any near contact counts) because its layout was the broken one; the other four use the tight test so only real intersections trigger a move. Positions stay inside the existing scene bounds.

**Result:** 0 intersecting pairs across 124 builds in all five compositions on both tiers (161 before). Formations moved: Procession 44 percent, Dune sea 9, Star dune 9, Crescents 11, Scatter 3. Every formation's geometry, rotation and contents are identical to before (144 builds), and The Tidal Archive and The Blooming Silence are identical to before (50 builds each). The earlier Tidal Archive correction is intact.

**Known limit:** formations drift slowly (they bob and turn), so two that were placed close can very occasionally touch again after a couple of minutes. In 42 builds watched for 3 simulated minutes, one pair briefly grazed (Star dune, seed 19).

## Tidal Archive: removing the ghostly mountain behind the central library

**What it was:** a translucent, jagged, mountain-like shape standing above and behind the library on the central island, visible on desktop in all five compositions. It was not a modelled structure. It was the reflection mesh of the central island. Reflections are drawn by mirroring each island's mesh about the sea surface, and the central island's long rocky underside sits well below the sea, so its mirror image rose above the surface (up to about 10 units above the island's position) as a pale mountain. Satellite islands were not affected: their mirrors stay at or just below sea level.

**The fix:** a reflection should only show what is above the water, so the central island's mirror is cut at the waterline: triangles whose original position is below the sea surface are not mirrored. This is the only change. The first attempt, deleting the central island's mirror altogether, also removed its legitimate reflection in the water, so it was replaced by the waterline cut. Nothing replaces the structure.

**Why it cannot come back:** the cut depends only on the geometry and the sea level, not on the composition or seed. Over 80 seeds covering all five compositions, the highest point of the central island's mirror is 0.25 units above the sea surface (the island's own bobbing), against several units before. The mobile tier never drew mirrors.

## Particle system rebuild and seed-driven variation

### Why the particles were still hard to see (investigation)
Measuring real frames showed three underlying causes, not just small values:
1. **Effective size:** a grain was drawn as a 2 to 3 pixel point whose alpha fell off with the square of the distance from its centre, and its brightness was also pulsed down to about a third. The visible core of each grain was about one pixel at roughly 40 percent opacity.
2. **Placement:** particles lived in fixed boxes in the world, so a camera at 40 units saw only a thin slice of them, and most grains sat outside the view or far away where they shrank further.
3. **Contrast:** light grains on a light background change almost nothing.

### The new particle system
- **Camera-anchored layers:** a layer can wrap around the camera, so wherever the visitor orbits or zooms, grains fill the view. Behind them a world-anchored layer covers the distance. Grains fade out only very close to the lens.
- **Crisp discs with a clamped size:** a hard-edged disc with a soft rim, a minimum and maximum pixel size, and distance scaling that only goes between 0.55 and 2.4 times. Brightness pulses between 68 and 100 percent instead of dipping to a third.
- **Two looks:** crisp grains and soft glowing discs (for medium particles and dust).
- **Contrast on bright ground:** the Dunes use normal blending (additive does nothing on a light background), a slightly darker rim, and a deeper gold in the palette so grains read on bright dune tops as well as on darker areas. Tidal and Blooming keep additive glow, which suits their dark backgrounds.
- **Movement:** every particle follows the layer's velocity with per-particle speed variation, plus gusts (slow sine modulation along the wind) and small turbulence on all axes. Continuous, not looping in an obvious way.
- **Density slider:** each system draws only a fraction of its points, so 0, 50 and 100 percent are clearly different (measurements in `docs/TESTING.md`).

Layers per world (desktop counts; mobile uses about 60 percent):
| World | Fine grains / droplets / pollen | Medium and dust | Streams and sheets | Other |
|---|---|---|---|---|
| Suspended Dunes | 1,600 near the lens plus 2,600 through the scene, in warm ivory, gold, peach and deep gold, following the wind | 420 soft medium particles; 150 very faint large dust motes | 8 streams of blowing sand and 3 low blowing sheets; curtains falling from each dune's lee edge | Wind direction changes with the seed |
| Tidal Archive | 700 near plus 1,000 behind: rising bubbles in pale blue, cyan and soft white | 220 soft glowing motes | 500 glints on the sea surface | Waterfalls of droplets; droplets around each water lens |
| Blooming Silence | 800 near plus 1,100 behind: dusty pink, lavender and white pollen | 240 soft glowing pollen orbs | 3 slow pollen streams | Falling petals |

### Seed-driven variation: composition archetypes
Previously a seed only jittered positions and sizes, so a new seed looked like the same scene. Now each world has five compositions, and the seed chooses one (using its own random stream, so it can be asked for without building the world). The default seeds always give the first composition. Generate Variation picks a new seed that lands on a different composition, keeps the visitor's sliders, and the HUD shows the composition name beside the seed.

**The Tidal Archive**
- Compositions: Great arch (arch framing a bookcase wall), Nave (two rows of columns leading to a wall), Rotunda (ring of columns and lintels around a tall central bookcase), Tunnel of arches (four nested arches shrinking into the distance) and Spires (three leaning bookcase towers of different heights).
- Seed also changes: sea level, wave height and direction, number and kind of satellite ruins (tower, ring, arch, gate, bare), number of islets, silhouettes, water lenses (two to five), drowned columns and far arches, number of pages and debris, fog density and which side the light comes from.

**The Blooming Silence**
- Compositions: Hero bloom, Garden ring (a ring of blooms around a small centre bloom), Cascade (blooms sweeping along an S-curve from near to far), Hanging bells (a canopy of hanging blooms over two upright ones) and Twin giants (two large blooms facing each other).
- Six species (star, bell, lotus, trumpet, poppy, thistle): the seed picks three or four, jitters every petal parameter by about 20 percent, and applies one of three colour moods (pink, lavender or pearl). Leaf size, count and slenderness, stem length and wander also change per world.

**The Suspended Dunes**
- Compositions: Dune sea (broad mounds scattered through depth), Procession (long, horned ridges along a curving path, shrinking into the distance), Star dune (radial arms around a high centre), Crescents (horned barchan-like bodies around an empty centre) and Scatter (many small formations).
- Seed also changes: wind direction, crest profile (how sharp the crest is, how steep the lee face), ripple spacing, sun direction (shadows fall differently), and the stone arrangement: cluster, henge (a ring), avenue (two rows) or solitary slab with satellites.
- A soft cap on dune height stops overlapping lobes from forming spikes.

### Keeping it intentional
Every composition is a hand-designed layout with seeded parameters, not free randomness. Palettes are fixed per world, each composition has a fixed opening camera, and colour variety stays inside the world's palette.

### Reproducibility
The same seed gives the same world (checked by rebuilding and comparing geometry). The composition depends only on the seed. Kept worlds store the seed and slider values, so a kept world reopens exactly.

## Suspended Dunes: particle visibility and standing stones

### Particles
- **Investigation:** the particles were being generated (about 2,400 points in 23 systems), positioned inside the scene and animated. They were nearly invisible for rendering reasons: at the default camera each point was only about 0.2 to 1 pixel across, they used additive blending (adding light to an already light, warm background changes almost nothing), and the main ambient system was spread through a box much larger than the view.
- **Size:** point size now has a minimum in pixels (about 2.4 px) and a gentler distance falloff, so far grains do not shrink to nothing.
- **Blending:** the dune grains use normal blending in ivory, muted gold and soft peach, so they read as specks on the warm background. The other worlds keep additive glow, which suits their darker backgrounds.
- **Layers:** fine drifting grains (about 3,600 on desktop, in a volume around the view, moving with the wind); a few hundred larger, very faint dust motes that barely move; a low, faster blown sheet near the dunes; six occasional narrow streams of grains crossing the scene along the wind; and denser, slightly larger sand curtains falling from the lee edges.
- **Density slider:** it limits how many points each system draws, and the measured number of changed pixels doubles from 50 percent to 100 percent and is zero at 0 percent. Mobile builds use about 60 percent of the counts.
- **Restraint:** alpha stays below about 0.9, the faint dust is about 0.24, and at 100 percent the particles cover roughly 1 percent of a frame, so they read as sand in the air and not as noise.

### Standing stones (replacing the thin vertical sticks)
- **What the sticks were:** four thin box meshes, 0.2 to 0.4 wide and up to 3.2 tall, stood on the biggest dune as scale markers. Boxes that narrow read as poles, not stones.
- **Replacement:** a designed cluster on a high, gentle part of the largest dune, plus a smaller group on one other large formation. Each stone is a seven-sided tapered shape (broad base, narrower top), flattened front to back, roughened with noise, leaning slightly, with a broken top and a chip on one side. Sizes come in three classes (one tall, two medium, several small); the tallest is 2.3 to 3.1 tall and 1.6 to 2.1 wide.
- **Natural integration:** each stone is sunk about a fifth of its height into the sand, so there is no visible base line. Sandstone colours with banded strata, a few fallen fragments, and shadows from the same sun.
- **Proportions are checked:** across 120 builds (60 seeds, both tiers), every stone has a height to width ratio under 2.2, none is taller than 3.3 or narrower than 0.65, and no box geometry remains in the dunes world.

## Composition and identity pass

Brief: stop adding geometry; art-direct each world so it has one clear idea, a focal point, recognisable silhouettes and depth. Decisions below were checked by rendering the worlds with a real software GL renderer and looking at the frames.

### Investigation: why the Blooming Silence showed only a purple background
Rendering the world with a real WebGL context (software GL) reproduced it: the renderer threw an error on every frame, so nothing was drawn. Cause: all petal meshes shared one material, but some of them had per-instance colours and some did not (the falling petals, and layers with no instances). In this version of Three.js the shared material then asks for an instance-colour attribute that some meshes do not have. Geometry, positions and fog were all fine; my earlier Node tests could not see it because they had no real renderer. Fix: every instanced mesh now gets an instance colour at creation (the falling petals set all of theirs to white, which also fixed black petals). The same render test is now part of the project.

### The Tidal Archive: an abandoned library reclaimed by an impossible ocean
- **Focal point:** one monumental ruin on the central island: a thick, intact great arch framing a tall bookcase wall, with a cyan glow and a faint light shaft behind it, and a broad stair that runs off the island toward the water. Everything else is deliberately quieter and smaller.
- **Less repetition:** the ring of near-identical arches is gone. Four satellite islands each get a different ruin (lone leaning bookcase, broken ring of columns, a small collapsed arch, a bare rock with scattered books), chosen by a seeded shuffle so no two repeat. The two partial arches beside the great arch differ in scale and in how they have failed.
- **Integration with the ocean:** the sea is much closer to the islands, so island undersides dip into it. Three sea-level islets carry half-sunk, tilted bookcases rising out of the water. Pages drift on the surface as well as in the air. Waterfalls of light run from rims to the sea. The disconnected free-floating shelves were removed.
- **Depth and atmospheric perspective:** a huge flat plane carries the ocean to the horizon; low mist banks sit on the water; seven large silhouette islands and drowned columns and two far arches stand in the distance and fade into fog; fog is lighter and thinner so layers separate by tone.
- **Camera:** opens on the great arch, low and slightly off-axis.

### The Blooming Silence
- **Hero composition:** one large bloom faces the camera at the centre and is the brightest, largest thing in the frame; four secondary blooms of different species sit around it at different depths, two bells hang above, and small blooms and buds recede into fog.
- **Four distinct silhouettes:** star (long, pointed, recurved), bell (broad, closed cup), lotus (many short layered petals) and a new trumpet (narrow funnel with a flared lip). Variation inside each species comes from non-uniform scale, petal count, spiral or ring arrangement and tint.
- **Delicate stems and leaves:** thinner, tapered stems with a calyx; the hero has five leaves, larger than the others.
- **Tone:** less light on the petals so they keep their pink and lavender instead of blowing out to white; pollen stays sparse.
- **Camera:** opens close on the hero.

### The Suspended Dunes: an almost endless suspended desert
- **Why the ribs went:** parallel sawtooth ridges read as ribbed rock. Dune bodies are now built from three or four large asymmetric lobes: a long gentle windward rise, a crest, a steep lee drop, crescent-shaped horns and noise-warped sinuous crests.
- **Broad, smooth surfaces:** lobes are wide along the crest and short along the wind, so each body is a low, flowing mass. Edges are feathered into thin sand sheets and the belly is a soft lens in peach and clay.
- **Variety and scale:** formations have very different sizes, plan shapes (soft, noisy ellipses) and random orientations, spread over a large hazy space. Standing stones on the largest give a human scale. Low haze, a distant sun and light shafts give depth.
- **Ripples:** fine ripples remain, but only on slopes and more gently, to avoid a striped look.
- **Sand:** finer, smaller grains in thin curtains from the lee edges, drifting with the wind (visibility later improved; see the section above).
- **Camera:** opens wide and low across the field.

### Alternatives considered and rejected
- Adding more architecture or more petals: it raised clutter, not clarity.
- Peaked, narrow lobes for dunes: they read as mountains, so lobes were widened and flattened.
- Rendering the sea with a real reflection pass: too costly for phones; mirrored islands and a glitter sprite stay.

## Final visual refinement pass

Goal: move from "procedurally generated" to "atmospheric art exhibition" without changing the project's architecture, interface, palettes or seed determinism. Everything below is still generated in code, with no external models or textures.

### The Tidal Archive
- **Eroded islands:** each island now has a random plan aspect and shear, a stronger domain warp, a sea-worn undercut band just below the rim (a gaussian notch in radius, modulated by noise), eroded gullies on the terraced top (ridged noise subtracted from height), a high-frequency crumble layer, weathering streaks and rubble hanging just off the rim. Boulders remain on top.
- **Ancient, irregular architecture:** nothing is perfectly regular any more. Arches lean slightly, have blocks jittered, sometimes collapse on one side (a shorter pillar, missing blocks, no capital) and leave rubble. Cornices are broken into pieces with gaps. Bookcases tilt, boards sag, books lean or are missing, and a few lie fallen on the plinth. Columns lean and have broken tops, with a fallen drum. Stone is mottled by noise and greener near the base (algae).
- **Water:** the sea sums four directional waves with sharpened crests; foam appears on the tallest crests; heights, colours and normals are refreshed every second frame. It uses a Phong material, so the light gives real specular highlights. A reflected glitter path sits under the light, and faint mirrored copies of the islands sit below the surface (desktop only), drawn before the sea so they show through it.
- **Droplets and pages:** each suspended water lens has its own drifting cloud of droplets, and beads of water hang near the lenses. Loose pages are now instanced sheets that orbit slowly and flutter.
- **Depth:** three mist layers (low, mid, high), faint pulsing light shafts, and a cool rim light.
- **Particles:** pale blue, cyan and soft white, fewer and softer.

### The Blooming Silence
- **Softer petals:** the outline is rounded (a sine profile raised to a power, so tips are blunt rather than pointed), the ruffle is lower-frequency, the colour ramp is gentler, the midrib fainter, and the grid is finer (22 by 12 on desktop), so shading is smooth rather than faceted. The petal material emits a little more light.
- **More variation, same cost:** every bloom now has its own petal length, width, petal count, extra opening angle, and either an even ring or a golden-angle spiral of petals. Instances are scaled non-uniformly (along the petal's own axes), tinted per bloom (white, pink-white, lilac-white) with instance colours, and tilted more widely. The three species remain.
- **Natural stems:** tubes are tapered from thin at the flower to thick at the far end, with small nodes, built from five control points with sideways wander. Each has a calyx under the flower and two to four curved leaves placed along it.
- **Pollen:** about a third fewer motes, smaller and softer, mostly dusty pink with some lavender and a little white. Haze is only pink and lavender.
- **Preserved:** the slow, phase-shifted breathing of every layer.

### The Suspended Dunes
- **Dunes, not bowls:** formations are now thin, elongated, teardrop-shaped sheets. The plan is an ellipse along the crest direction with a pointed tail toward the lee side and a ragged outline. Thickness is only about a fifth to a third of the radius, and the belly is a rounded lens with noisy, ledged strata bands, so they read as slices of desert rather than islands. Five small fragments sit among the large ones. All share one wind direction, so crest lines line up across the scene. Placement avoids overlaps.
- **Contours:** dune waves are a smoothed sawtooth (a few harmonics of a saw wave), giving a long windward slope, a sharp crest and a steep lee face. Crest phase is warped by low-frequency noise so crests meander, and a second set crosses at an angle.
- **Ripples:** fine ripples are real geometry, and the grid is much denser (up to about 200 by 64 on desktop). Ripples and slope also tint vertices. Mobile gets a coarser grid.
- **Sand:** each large formation has a wide, dense curtain of grains falling from its lee edge and sometimes a thin stream; small fragments have a thin trickle. Blown sand follows the wind direction.
- **Light:** a low, warm sun with a hemisphere fill, soft light shafts, low haze layers and a large sun glow. On desktop the sun casts soft shadows (a 1024 shadow map), so formations shade each other and crests shade their own lee faces.
- **Particles:** warm ivory, muted gold and soft peach.

### Techniques added in this pass
| Technique | Used for |
|---|---|
| Gaussian notches in radius | Sea-worn undercuts |
| Per-element jitter and collapse rules | Ancient, irregular architecture |
| Multi-wave sea with a trochoid-style crest | Convincing wave movement |
| Mirrored geometry with render order | Reflections without a reflection pass |
| Non-uniform instance scale, spiral angle and instance colours | Petal variety at one draw call per layer |
| Tapered, noded tube plus leaf blades | Botanical stems |
| Smoothed sawtooth from a few harmonics | Dune cross-section |
| Teardrop polar plan with a lee tail | Dune silhouettes |
| Shadow map from a directional light | Soft dune shadows |

### Alternatives considered in this pass
- A true planar reflection of the sea (a second render, too costly on phones): replaced by mirrored islands and a glitter sprite.
- Ripples through normal perturbation or a custom shader: rejected because Lambert lighting in this renderer version is per-vertex, and a custom lit shader was a risk I could not test.
- Dune formations as full-thickness slabs: they read as islands, so thickness was cut sharply.

## Phase 5 to 7 experiments: controls, notes, preservation

### Experimentation controls
- **Fog density:** multiplies the scene fog density live.
- **Particle density:** each particle system shows only a fraction of its points (a draw range), so there is no rebuild.
- **Colour mood:** a warm or cool tint colour (up to 55 percent) is multiplied onto every material colour, light colour, fog colour and sky colour, always from the stored base colour, so sliding back to zero restores the palette exactly. Particle colours are baked into their shaders and are not tinted.
- **Structure scale:** each world decides what scales. Tidal Archive: architecture and shelves (about the island's footing). Blooming Silence: blossoms (petals, stamens, glow). Suspended Dunes: the slabs.
- **Generate variation:** a fresh random seed, keeping the sliders.
- **Alternative considered:** sliders that rebuild geometry (more flexible, but slow on phones).

### Preservation
- A kept environment is the world index, seed, the four slider values and a thumbnail. Nothing else is needed to rebuild it, which is the main payoff of the seed system.
- **Thumbnail:** WebGL canvases are blank outside the frame that draws them, so the capture runs in the same task, right after the next render.
- **Storage:** localStorage with validation on load. If storage is blocked, kept worlds live in memory for the visit and the visitor is told. If storage is full, the save is retried without the picture, then refused with a message. The collection is capped at 24.

## Technique summary

| Technique | Used for |
|---|---|
| Seeded value noise and fbm | Islands, sea, dunes, rim shapes |
| Domain warping | Less blobby islands, meandering dune crests |
| Ridged noise | Rocky spines under islands |
| Skewed sine waves | Dune profiles |
| Parametric surfaces | Petals |
| Rule-based placement | Arches, bookcases, colonnades |
| Instancing | Petals, falling petals |
| Mesh merging with vertex colours | Architecture, debris, stems |
| GPU-animated points | Every particle effect |
| Polar grids | Dune slabs |

## Design decisions

| Decision | Reason |
|---|---|
| Camera glide, not a cut, between states | Keeps the exhibition feeling continuous |
| Sky colours change per world during entry | The transition carries the mood before the world exists |
| Labels are real buttons beside each orb | Keyboard access and a bigger tap target on touch |
| Touch: first tap reads, second enters | No hover on touch devices |
| Quiet text links instead of button shapes | Matches the minimal, gallery tone |
| Settings are live where possible | Sliders respond instantly; only a new seed rebuilds a world |
| Kept worlds store a recipe, not a model | Tiny storage, exact reopening |
| Panels on the left, links on the right | Keeps the view centred and clear |
| One focal point per world, a quieter supporting cast | Visual hierarchy |
| Each world opens on a composed camera view | The first second should look intentional |
| Particle volumes follow the camera | The view is always full of particles, wherever the visitor looks |
| A seed chooses a composition, then its details | Variations are different scenes, not jittered copies |
| Generate Variation never repeats the current composition | Every click is a visible change |
| Grains have a minimum pixel size and normal blending on light backgrounds | Particles must be visible before they can be subtle |
| Standing stones are broad, broken and half-buried | Reads as landscape, not as markers |
| Dune formations are thin and aligned | Reads as desert, not as islands |
| Pollen palettes are per world and restrained | Atmosphere without distraction |
| Dark-only theme | The artwork depends on a night palette; light mode would break it |
| Portrait layout stacks orbs vertically | Keeps them large with a bottom sheet for the record |
| Veil, then title card, then reveal | Hides world construction and lets the camera fly in after the veil lifts |
| Drag, wheel and pinch plus slow drift | Explorable, and it still moves when untouched |
| Seeds drive all generation | Reproducible worlds, and a base for saving in Phase 7 |
| Lambert materials with vertex colours | Soft lighting, very cheap, no custom lighting shaders to break |

## Open questions
- How should the world-to-world journey feel: always through the Atlas, or direct? (Currently always through the Atlas.)
- Should a kept world store a user-given name?
- Should kept variations (Phase 7) show their seed to the visitor?
- AI-written field notes could replace the stored observations in `js/worlds.js`.

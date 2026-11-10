# Project reflection

## What worked
- **One number per world.** The seed system made variation, preservation and testing almost free: a kept world is just a recipe.
- **Few techniques, used well.** Noise, skewed waves, a parametric surface, instancing and GPU particles carry all three worlds, and each world still reads differently.
- **Fog, haze and a restrained palette** did more for the dreamlike feel than extra geometry.
- **Building behind a veil** hides construction time and makes entry feel cinematic.

## What was hard
- Making petals feel organic without per-frame mesh changes: variants, jitter and species were the compromise.
- Dune readability: height alone was not enough; slope lighting and a denser grid made the difference.
- Working without seeing the render: logic could be tested, appearance could not, so visual tuning depends on feedback.

## The final pass
The biggest gains came from changing silhouettes and proportions (thin dunes, eroded islands, irregular ruins), not from adding effects. Restraint with particles mattered as much as adding detail.

## What I would do differently
- Compile shaders and capture screenshots in an automated browser test before delivery.
- Add a user-given name to kept worlds and a way to share a seed.
- Add soft audio and a gentler first-visit guide.

## Design principles that held
Quiet interface, motion that never snaps, no game language, every control reachable by touch, and nothing that needs an external asset.

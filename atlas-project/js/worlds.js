/* worlds.js: the data for the three worlds.
   Edit this file to change names, text or colours. No 3D code lives here.
   Field notes can later be swapped for AI-written text by changing `description` and `observations`. */
window.WORLDS = [
  {
    id: 'AW-001', numeral: 'I', name: 'The Tidal Archive',
    coords: '12°41′ S, 047°09′ W',
    status: 'Charted, archive intact',
    description: 'A drowned library lifted into the air, its shelves still remembering the weight of water. Stone arches ring faintly with every tide that never comes.',
    observations: [
      'Every shelf leans a few degrees toward the sea, as though still listening to it.',
      'The books cannot be read, but their spines change colour with the hour. Pages drift loose and are never found twice.',
      'Water hangs in rounded lenses between the islands. It does not fall, yet thin threads of light spill from the island rims.'
    ],
    method: 'Method: noise-displaced terrain and procedural architecture',
    core: '#7C93C3', glow: '#A9E3E8', a1: '#35507f', a2: '#141f3d'
  },
  {
    id: 'AW-002', numeral: 'II', name: 'The Blooming Silence',
    coords: '33°08′ N, 118°52′ E',
    status: 'Partially observed',
    description: 'Giant blossoms hang from nothing, opening once in a century. Their silence is so complete that light moves through it on tiptoe.',
    observations: [
      'Three kinds of bloom were seen: star-shaped, bell-shaped and layered. They never grow within sight of their own kind.',
      'Each bloom breathes, opening and closing out of step with its neighbours. The slowest takes nearly a minute.',
      'Stems hang upward into haze and are never seen to end. Single petals fall in every direction, but only downward.'
    ],
    method: 'Method: parametric geometry and procedural botanical growth',
    core: '#D8A7B8', glow: '#B9A7E0', a1: '#7a4a73', a2: '#26173c'
  },
  {
    id: 'AW-003', numeral: 'III', name: 'The Suspended Dunes',
    coords: '04°57′ N, 161°30′ W',
    status: 'Drifting, unverified',
    description: 'Slabs of rippled sand drift above their own shadows, shedding grain by grain into a sky that has forgotten how to fall.',
    observations: [
      'The dunes are steeper on the sheltered side. A wind that nobody feels has shaped every one.',
      'Fine ripples cover the slopes and are redrawn each time the visitor looks away.',
      'Sand streams from the undersides in thin threads. Nothing is ever seen to land.'
    ],
    method: 'Method: mathematical wave functions and layered terrain',
    core: '#F4EDE0', glow: '#E6BFA8', a1: '#9a7468', a2: '#35283a'
  }
];

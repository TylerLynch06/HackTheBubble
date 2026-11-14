// Single list of every effect. Shared by the content scripts AND the popup.
// Adding an effect? Add a line here, create src/effects/<id>.js, and add it to manifest.json.
self.LIQUID_EFFECTS = [
  { id: 'glassify',      name: 'Liquid Glass™',     defaultOn: true,  description: 'Frosts every button and card. Text contrast courageously fades the longer you stay.' },
  { id: 'wobble',        name: 'Jelly Text',        defaultOn: true,  description: 'Headings shimmer like a pool. Anything you hover turns to jelly.' },
  { id: 'slosh',         name: 'Syrup Scroll',      defaultOn: true,  description: 'Scrolling is slow to start, refuses to stop, and the page sloshes.' },
  { id: 'drip',          name: 'Dripping Letters',  defaultOn: true,  description: 'Letters melt off the page and pile up at the bottom of the screen.' },
  { id: 'water-level',   name: 'Rising Tide',       defaultOn: true,  description: 'The browser slowly fills with water. Click to bail. You will lose.' },
  { id: 'liquid-cursor', name: 'Liquid Cursor',     defaultOn: true,  description: 'Your cursor is now a lagging blob of glass sitting on whatever you read.' },
  { id: 'fluid-buttons', name: 'Fluid Buttons',     defaultOn: true,  description: 'Buttons and links flow away from your cursor like water.' },
  { id: 'keynote',       name: 'Keynote Mode',      defaultOn: true,  description: 'A launch-event modal and helpful notifications nobody asked for.' }
];

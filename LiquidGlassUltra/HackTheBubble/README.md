# Liquid Glass Ultra™ 💧

> *Our most liquid browser ever. Now with 0% solids.*

Hack the Bubble entry, theme **"I hate the user"**. A Chrome extension that takes "Liquid Glass" to its logical conclusion and turns the whole browser to liquid.

## What it does

| Effect | File | What happens to the user |
|---|---|---|
| Liquid Glass™ | `src/effects/glassify.js` | Every button and card is frosted. The blur thickens and the text fades the longer you stay on a page. |
| Jelly Text | `src/effects/wobble.js` | Headings and images shimmer like they're underwater. Anything you hover turns to jelly. |
| Syrup Scroll | `src/effects/slosh.js` | The wheel is slow to respond, the page keeps sliding after you stop, bounces off the ends, and the page sloshes. |
| Dripping Letters | `src/effects/drip.js` | Letters melt off the page, fall, and pile up in a puddle at the bottom of the screen. |
| Rising Tide | `src/effects/water-level.js` | The window fills with water. You can't click anything under the waterline. Click the water to bail. |
| Liquid Cursor | `src/effects/liquid-cursor.js` | The cursor becomes a lagging, wobbling glass blob that blurs whatever you're reading. Clicks make ripples. |
| Fluid Buttons | `src/effects/fluid-buttons.js` | Buttons and links flow away from the cursor. |
| Keynote Mode | `src/effects/keynote.js` | An "Introducing…" launch modal and smug notifications. "Reduce Transparency" increases it. |

The popup has a master switch, a **Liquidity** slider (intensity 0–100%) and a toggle for each effect. Changes apply live.

## 🚨 Panic button

- **Alt+Shift+L** turns everything on or off (you can change it at `chrome://extensions/shortcuts`)
- **Esc three times quickly** on any page drains it
- **🚰 Drain everything** button in the popup

## Install (each of us)

1. `git clone https://github.com/TylerLynch06/HackTheBubble.git`
2. Chrome → `chrome://extensions` → turn on **Developer mode** (top right)
3. **Load unpacked** → select the `HackTheBubble` folder
4. Pin the 💧 icon. After you pull changes or edit code, hit ↻ on the extension card and refresh the tab.

Tip: test in a **separate Chrome profile** so your real tabs don't flood.

## Demo page (works offline, so no venue Wi-Fi needed)

```bash
cd demo && python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `demo/index.html` directly as a file only works if you tick **Allow access to file URLs** on the extension card.)

## Project layout

```
manifest.json          MV3 manifest. Content scripts load in order: effect-list → core → effects → boot
src/effect-list.js     Names, descriptions and defaults for every effect (shared with the popup)
src/core.js            Registry, settings, panic button, helpers (Liquid.util.el / svg / layer / toast)
src/effects/*.js       One file per effect. Each calls Liquid.register({ id, start, stop })
src/effects/_template.js  Copy this to make a new effect
src/background.js      Alt+Shift+L shortcut and toolbar badge
popup/                 The glassy settings popup
demo/index.html        Fake news site for testing and judging
```

## Adding an effect (about 2 minutes)

1. Copy `src/effects/_template.js` to `src/effects/<id>.js`
2. Add `{ id, name, description, defaultOn }` to `src/effect-list.js`
3. Add the file to `manifest.json` → `content_scripts.js` (before `src/boot.js`)
4. Reload the extension

House rules: `stop()` must undo everything; create elements with `Liquid.util.el` (they're tagged `data-lq`, so other effects ignore them); put overlays in `Liquid.util.layer()`; read `Liquid.intensity` live; no `innerHTML`.

## Team workflow

- One branch per effect: `git checkout -b effect/evaporate`
- Each effect lives in its own file, so conflicts only happen in `effect-list.js` and `manifest.json` (one line each, easy to merge)
- Merge to `main` often. Keep `main` demo-able at all times.

## Ideas backlog (vote and grab one)

- **Evaporation**: images slowly fade to steam and float up
- **Condensation**: droplets form on the "glass" and run down the screen; wipe them with the mouse
- **Spill**: typing in an input sometimes "spills" the letters across the page
- **Ice Age**: idle for 30s and the page freezes (frost overlay); scroll to thaw
- **Tide Tables**: water level follows a fake tide schedule shown in a corner widget
- **Fish**: once the water is high enough, a fish swims past and eats a button
- **Hydraulic Press**: the tab title slowly leaks characters (`document.title`)
- **Sound**: sloshing and drip sounds via Web Audio (one mute switch!)

## Known issues

- Syrup Scroll briefly skews `<body>`, so sticky and fixed headers jiggle while scrolling (arguably a feature)
- Jelly Text is heavy on huge pages. Turn the Liquidity down if a laptop struggles
- The extension can't run on `chrome://` pages or the Chrome Web Store (Chrome blocks it)

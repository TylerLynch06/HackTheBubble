# Liquid OS 26: talking points

For the presentation and the questions afterwards. Two voices are used below:

- **On stage** is the straight-faced keynote line. Deliver it as if it were true.
- **How it really works** is the honest technical answer for when a judge asks.

## The pitch in one breath

Liquid OS 26 is the biggest update to the web, ever. It brings a fluid new design language, Liquid Life, to
every website you visit, alongside seven features that anticipate what you need before you ask and continue
after you say no.

**Theme fit ("I hate the user"):** every feature is a real thing a real tech company ships (a redesign,
accessibility, dark mode, focus, low power, read aloud, white noise), taken one step past the point where it
helps. Nothing is random cruelty; each one has a plausible product reason, which is what makes it hostile.

## Numbers you can quote

| | |
|---|---|
| Code | About 4,600 lines of JavaScript in 36 files |
| Dependencies | None. No libraries, no build step, no images for the 3D models |
| Network use | None. It works offline and sends nothing anywhere |
| Permissions | Two: `storage` (settings) and `tts` (Read Aloud) |
| Water simulation | A grid of 8-pixel cells covering the window (about 130 x 98 on a laptop), stepped every frame |
| 3D models | Built in code: a ship is 142 flat faces, the megalodon 117, a duck 57 |
| Features | 1 design language with 5 levels, 7 features, 4 sea creatures, 1 fake shop |

Measured early on, on one laptop: the water alone cost about 2 to 4 ms per frame and held 50 to 60 frames a
second on a long Wikipedia article. We have not benchmarked the full High Seas scene, so don't quote a frame
rate for that.

---

## Feature by feature

### Liquid Life (the design language)

**On stage**
- "For thirty years the web has been flat, dry and, frankly, solid. We asked: what if it wasn't?"
- "Liquid Life responds to you. Every movement of your cursor leaves a wake. Your content is no longer on a
  page. It is in a medium."
- "It is our most liquid interface ever. 0% solids."

**How it really works**
- The water is a **heightfield wave simulation**: a grid of heights, where each cell's next value comes from
  its four neighbours minus its own previous value, times a damping factor (0.985). It is the classic
  two-buffer ripple algorithm. Splashes just add a bump to the grid.
- The page really bends. Each frame we turn the grid's slopes into a small image (red = sideways slope,
  green = vertical slope) and feed it to an **SVG displacement filter** applied as a `backdrop-filter` on a
  transparent overlay. The browser shifts every pixel of the live page by that map, so text, images and
  video refract, and the page stays fully clickable underneath.
- A second small canvas draws white glints on slopes facing the light and blue shadow on slopes facing away.
  That is what makes it read as wet instead of wobbly.
- When the water goes flat, the loop stops and the overlay is removed, so an idle page costs nothing.

**Good questions and answers**
- *"Is it a screenshot?"* No. It is the live page, refracted by the browser's own filter pipeline.
- *"What was the hard part?"* Getting the slope image into the filter fast enough. Reading it back from a
  GPU canvas took about 11 ms a frame; switching that one canvas to CPU mode brought it to about 1.4 ms.

### The whirlpool

**On stage**
- "Sometimes you want to reorganise your content. All of it. At once. Simply stir."
- "The faster you stir, the more reorganised it becomes."

**How it really works**
- We track how much the cursor's direction of travel has turned. Circling adds up, zig-zags cancel out, and
  slow circling leaks away, so it takes five brisk laps.
- Page elements are picked up into a small physics system and carried in orbit; keep stirring and the spin
  speeds up. Stop, and everything is thrown outward, then springs back to exactly where the page had it.
- Elements are only ever moved with an inline CSS transform, and the original value is restored afterwards.

### High Seas (ships, kraken, megalodon, whale, ducks)

**On stage**
- "Liquid Life is not just a surface. It is an ecosystem."
- "Your browser now supports shipping. And piracy."
- "The megalodon uses on-device intelligence to locate your cursor."

**How it really works**
- There is a **3D renderer written from scratch** in about 250 lines, drawing to one 2D canvas. No WebGL, no
  Three.js.
- Models are built in code from points and flat coloured faces. Each face gets one colour from its angle to a
  sun direction (flat shading), back faces are skipped, and faces are drawn far-to-near.
- The camera looks straight down, with height leaning up the screen (an oblique projection). That keeps water
  positions equal to page positions, so a ship at page position x, y is drawn exactly there.
- Faces are **clipped at the waterline**, which is why a sinking ship really goes under and only the
  megalodon's fin shows while it cruises.
- A ship is two half-hulls, so when it is sunk the halves can separate: the bow rears up and slides under, the
  stern rolls over.
- Ships steer with a simple rule set: find the nearest enemy, close in, turn side-on, circle, fire when the
  enemy is abeam.

**The cursor capture, which people will ask about**
- A web page cannot move your real mouse pointer. So when the kraken or megalodon grabs it, we hide the real
  cursor behind a transparent shield and draw a stand-in that the creature holds.
- Your real mouse keeps moving invisibly, and that movement is the game: shake to escape the kraken, pull
  against the megalodon to drag the cursor back out.

### Buoyancy and the business model

**On stage**
- "Content now floats according to its importance. We've done the ranking for you."
- "Liquid Life Dry. The web you love, without the water we added. From 9.99 a month."
- "Payment failed. Your card appears to be wet."

**How it really works**
- Buoyancy finds ads, cookie banners, newsletter boxes and sidebars by common names in the page's code and
  floats them to the top; paragraphs and headings sink, tilt and fade.
- The shop is a parody of a paywall. It has **no input fields and takes no payment details**; "Subscribe"
  waits a moment and always fails. Worth saying out loud if anyone looks worried.

### Larger Text

**On stage**
- "Accessibility is a core value. So we made text larger. Significantly."
- "At 600%, every word gets the attention it deserves. Individually."

**How it really works**
- Every element that contains text has its font size replaced with `original size x a CSS variable`, so the
  scale is one number (6). Text is also made bold and the page body is zoomed to 140%.
- Only text grows. Boxes and layouts stay the same size, so everything overflows.
- A watcher catches text added later (infinite scroll, menus) and scales that too.

### Dark Mode and Light Mode

**On stage**
- "Dark Mode, perfected. We removed the last source of eye strain: the content."
- "And for those who prefer it: Light Mode. All of the light."

**How it really works**
- One overlay with a radial gradient centred on the cursor. Dark Mode is black with a small clear beam; Light
  Mode is white, brightest at the cursor, with a brightness filter on what is underneath.
- It sits above the water and the sea creatures, so the kraken is in the dark too.

### Focus

**On stage**
- "Search gives you ten results. That is nine decisions too many. Focus gives you one."
- "On every other site, Focus removes distractions. We define distractions generously."

**How it really works**
- On a Google results page it hides everything except the first organic result.
- Elsewhere it hides images, sidebars, navigation and every paragraph after the first.
- Everything it hides is remembered and put back when Focus is turned off.

### Low Power Mode

**On stage**
- "Rendering sixty frames a second is wasteful. Four is plenty."
- "Low Power Mode reduces colour depth to the colours you actually need."

**How it really works**
- An SVG filter pixelates the page into 6-pixel blocks and reduces each colour channel to seven levels.
- The browser's animation clock (`requestAnimationFrame`) is replaced with one that fires about 4.5 times a
  second. That has to be done twice: once for our own code and once inside the page's own JavaScript world,
  using a second script that Chrome injects into the page itself.
- The joke underneath: the filter makes the computer work harder, not less.

### Read Aloud

**On stage**
- "Reading is slow. Read Aloud delivers an entire article in the time it takes to find your headphones."

**How it really works**
- The page's text is sent to the extension's background worker, which speaks it with Chrome's built-in
  text-to-speech at 8.5 times normal speed. Only the tab you are looking at speaks.

### Zen Mode

**On stage**
- "The modern web is stressful. Zen Mode adds a calming tone, at moments chosen just for you."
- "For deeper calm, switch to Constant."

**How it really works**
- A low sawtooth tone around 150 Hz, generated with the Web Audio API; there is no sound file.
- Random mode plays it at unpredictable gaps (1.5 to 9 seconds, sometimes in quick clusters) with a different
  volume, length and pitch each time, so it can't be tuned out. Constant mode never stops.
- Browsers block sound until the page has been clicked, so **click the page before turning it on in the demo**.

### Automatic Updates and "fighting back"

**On stage**
- "Liquid OS updates itself. You don't need to do anything. You can't."
- "If you turn something off, we notice. We assume it was a mistake."

**How it really works**
- A countdown pill shows the next update. Every 20 seconds the Liquid Life level goes up one; at the top,
  remaining features are switched on.
- Features switch each other on in a chain (Low Power turns on Read Aloud and Dark Mode, Dark Mode turns on
  Larger Text, and so on), and anything turned off comes back five seconds later.
- This logic lives in the extension's **background worker**, not in the page, so it happens once however
  many tabs are open.

---

## Technical points worth volunteering

- **One source of truth.** All settings live in the extension's storage. The Control Centre, the admin panel
  and every tab only read and write that. Change something in one place and every tab updates.
- **It works on real sites, not a demo page.** That forced some choices: all our own styling uses inline styles
  and the Web Animations API with no injected markup, so strict sites can't block it.
- **Everything is reversible.** Every change to a page (moved elements, hidden text, eaten words, scaled
  fonts) records the original and restores it. Pressing Esc three times puts the page back exactly.
- **No libraries.** The physics, the 3D renderer, the models and the sound are all written by hand, which is
  why it loads instantly and has nothing to download.
- **It is built to be presented.** There is a hotkey for every reveal and a separate admin panel that can turn
  off the self-escalation, so one feature can be shown alone.

## Likely questions

**"Does this collect any data?"**
No. It makes no network requests and asks for two permissions, storage and text-to-speech. The fake shop has
no input fields.

**"How do I turn it off?"**
Esc three times, or "Turn everything off" in the Control Centre. On stage, the better answer is "why would
you want to?", followed by the real one.

**"Does it slow the browser down?"**
The water is cheap: a small grid and one filter. The honest caveat is that we measured the water alone, not
the full sea battle, and Low Power Mode deliberately makes things worse.

**"What was the hardest part?"**
Pick whichever you can speak to: bending the live page fast enough (the 11 ms to 1.4 ms fix), writing a 3D
renderer with a waterline, or faking cursor capture when the browser doesn't allow it.

**"What didn't work?"**
We built a rising tide with a beach wave and removed it. Click-drift
(clicks landing downstream of where you aimed) was cut too.

**"What would you do next?"**
A summary screen when you drain the page ("clicks delivered: 3 of 41"), water sound that follows the waves,
and a viscosity setting from water to honey.

**"How did everyone's work become one product?"**
Six of the features started as separate small extensions. They were rewritten as modules sharing one
settings store, one notification style and one panic button, so they can trigger each other.

**"Did you use AI?"**
Answer this truthfully for your team. The extension was written with Claude Code; the concept, direction,
testing and presentation are yours.

## Demo checklist

1. Reload the extension and refresh the demo tabs.
2. Open Admin, and decide whether "Chaos progresses by itself" should be on for your run.
3. **Click once on the page** so hotkeys and sound work.
4. Know your exits: Esc three times restores everything and also switches the self-escalation off.
5. Try every demo site at every level beforehand; some sites handle moved content badly.

# Liquid OS 26

> The biggest update to the web, ever.

Hack the Bubble entry, theme **"I hate the user"**. One Chrome extension that ships a complete
operating-system update for the web: a new design language (Liquid Life) and five helpful features.

| Feature | What it says it does | What it does |
|---|---|---|
| **Liquid Life** | A fluid new design language | Turns the page into water, with whirlpools, ships, a kraken, a megalodon and a paywall to make it stop |
| **Larger Text** | Improves legibility | Scales all text to 250%; nothing else grows, so everything overflows |
| **Dark Mode** | Easier on the eyes | Blacks out the page except a small beam at the cursor |
| **Light Mode** | Maximum brightness | Floods the page with white |
| **Focus** | Removes distractions | One Google result. On other sites, one paragraph |
| **Low Power Mode** | Saves energy | About 4 frames a second, in chunky pixels |
| **Read Aloud** | Reads the page to you | At 8.5x speed |

Features helpfully switch each other on: Low Power Mode turns on Read Aloud and Dark Mode, Dark Mode
turns on Larger Text, Larger Text turns on Focus. Turning things off is always honest.

## Install

1. `chrome://extensions` -> turn on **Developer mode** -> **Load unpacked** -> pick this `LiquidOS` folder.
2. Refresh any tab that was already open.
3. After pulling changes: click the reload icon on the extension card, then refresh the tab.

## Controls

The toolbar icon opens the **Control Centre**. Everything also has a hotkey (click the page first):

| Keys | Does |
|---|---|
| Alt+0 ... Alt+5 | Liquid Life level: Off, Calm, Wake, High Seas, Buoyancy, Chaos |
| Alt+. / Alt+, | Next / previous level |
| Alt+Shift+A / D / L / F / E / R | Larger Text / Dark Mode / Light Mode / Focus / Low Power / Read Aloud |
| Alt+S / K / M / H | Summon ships / kraken / megalodon / whale (High Seas) |
| Alt+W | Whirlpool at the cursor (or circle the mouse fast, five laps) |
| Alt+P | Liquid Life Dry(TM) store |
| **Esc x3** | **Panic: everything off, page restored** |

## Layout

```
manifest.json
popup/                 Control Centre
src/core.js            Liquid Life levels, hotkeys, panic, notifications
src/os.js              Settings shared by the five features
src/background.js      Read Aloud speech + the cascade between features
src/water/             Wave simulation and page refraction
src/sea/               3D scene renderer, models, cursor capture, event director
src/effects/           Liquid Life gags, one per file
src/features/          Larger Text, Dark/Light Mode, Focus, Low Power, Read Aloud
src/main-world/        Page-side frame throttle used by Low Power Mode
demo/index.html        Offline test page
```

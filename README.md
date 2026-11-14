# Liquid OS 26

> The biggest update to the web, ever.

A Chrome extension that ships a complete "operating system update" for every website you visit: a fluid new
design language and seven helpful features. Built for the Hack the Bubble hackathon, theme **"I hate the user"**.

**This is a joke. It is deliberately annoying.** It makes web pages hard to use on purpose. It collects no data,
makes no network requests and changes nothing permanently: every page goes back to normal when you turn it off.

## How to turn it off

**Press Esc three times, quickly.** Everything stops and the page is restored.

You can also use **Turn everything off** in the toolbar popup, or disable the extension at `chrome://extensions`.

## What it does

| Feature | What it says it does | What it does |
|---|---|---|
| **Liquid Life** | A fluid new design language | Turns the page into water, with whirlpools, ships, a kraken, a megalodon and a shop that sells you dryness |
| **Larger Text** | Improves legibility | All text at 600% and bold, page zoomed to 140%; about one word per screen |
| **Dark Mode** | Easier on the eyes | Blacks out the page except a small beam at the cursor |
| **Light Mode** | Maximum brightness | Floods the page with white |
| **Focus** | Removes distractions | One Google result. On other sites, one paragraph |
| **Low Power Mode** | Saves energy | About 4 frames a second, in chunky pixels |
| **Read Aloud** | Reads the page to you | At 8.5x speed |
| **Zen Mode** | Calming white noise | Low drones at unpredictable moments and volumes, or one that never stops |

Out of the box it also misbehaves in two ways (both can be switched off in the admin panel):

- **It fights back.** Features switch each other on, and anything you turn off or turn down comes back five
  seconds later.
- **It updates itself.** A countdown at the top of the page shows the next "automatic update". Every 20
  seconds the Liquid Life level goes up one, and once it reaches the top the remaining features are switched on.

Alerts appear all over the page and stay until you close them.

## Install

Works in Chrome, Edge and Brave on a computer. It is not on the Chrome Web Store, so it is loaded by hand:

1. Download this repository: green **Code** button, then **Download ZIP**, and unzip it. (Or `git clone` it.)
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the **`LiquidOS`** folder inside what you unzipped.
4. Refresh any tab that was already open.

It does not run on `chrome://` pages, the new tab page or the Chrome Web Store.

To update: replace the folder with a newer copy, click the reload icon on the extension's card, and refresh
your tabs.

## Controls

Click the toolbar icon for the **Control Centre**. Everything also has a hotkey; click on the page first.

| Keys | Does |
|---|---|
| **Esc x3** | **Everything off, page restored** |
| Alt+0 ... Alt+5 | Liquid Life level: Off, Calm, Wake, High Seas, Buoyancy, Chaos |
| Alt+. / Alt+, | Next / previous level |
| Alt+Shift+A / D / L / F / E / R | Larger Text / Dark Mode / Light Mode / Focus / Low Power / Read Aloud |
| Alt+Shift+Z / X | Zen Mode random / constant |
| Alt+S / K / M / H | Summon ships / kraken / megalodon / whale (at High Seas) |
| Alt+W | Whirlpool at the cursor (or circle the mouse fast, five laps) |
| Alt+P | Liquid Life Dry store |

Things worth trying: stir the mouse in fast circles and keep going; let the kraken catch your cursor, then
shake the mouse; let the megalodon eat it, then pull the other way; click a duck.

Sound (Zen Mode, Read Aloud) only starts after you have clicked on the page. That is a browser rule.

## Admin panel

For showing it to people. Click **Admin** at the bottom of the Control Centre; it opens in its own window.

- Two switches: **Control Centre fights back** and **Chaos progresses by itself**. With both off, nothing
  happens unless you make it happen.
- Buttons to trigger each creature, a test alert, a beep, or one step of chaos.
- "Leave out" chips to remove individual effects, so one thing can be shown alone.

Esc x3 switches both behaviours off as well. **Reset to product defaults** in the admin panel re-arms them.

## Privacy and safety

- No data is collected and nothing is sent anywhere. The extension makes no network requests.
- It asks for two permissions: `storage` (to remember your settings) and `tts` (for Read Aloud).
- The "Liquid Life Dry" shop is a parody. It has no input fields and cannot take payment.
- Light Mode is very bright, Low Power Mode flickers at low frame rates, and the water effect moves the whole
  page. If you are sensitive to bright or moving imagery, leave those off.

## For developers

No build step and no dependencies: the `LiquidOS` folder is the extension.

```
LiquidOS/
  manifest.json
  popup/                 Control Centre
  admin/                 Admin panel
  src/core.js            Liquid Life levels, hotkeys, panic, alerts
  src/os.js              Settings shared by the features
  src/auto-chaos.js      Automatic updates (the level creeping up)
  src/background.js      Read Aloud speech, and fighting back
  src/water/             Wave simulation and page refraction
  src/sea/               3D scene renderer, models, cursor capture, event director
  src/effects/           Liquid Life effects, one per file
  src/features/          Larger Text, Dark/Light Mode, Focus, Low Power, Read Aloud, Zen Mode
  src/main-world/        Page-side frame throttle used by Low Power Mode
  demo/index.html        Offline test page
docs/TALKING_POINTS.md   How each part works, and presentation notes
```

To make a zip of just the extension for sharing:

```bash
git archive --format=zip --output LiquidOS-26.zip HEAD:LiquidOS
```

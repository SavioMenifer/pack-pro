# Porter — AR Packing Guide

An augmented reality packing assistant powered by Gemini Live. Porter uses your device camera and live voice conversation to help you plan trips and pack your luggage — watching what you pack and checking items off the list in real time.

Built with [xrblocks](https://github.com/google/xrblocks) and the Gemini Live API.

---

## How it works

1. **TRIP_SETUP** — speak your trip details (destination, duration, bags). Porter builds a packing list.
2. **PACKING** — confirm you're ready. The camera activates. Porter watches you pack and marks items off as it sees them.
3. **DONE** — all packed. Ask any remaining questions.

---

## Prerequisites

- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey) with access to `gemini-2.5-flash-native-audio-preview-12-2025`

---

## Local development

```bash
npm install
npm run dev
```

The dev server binds to `0.0.0.0:8000` with HTTPS (self-signed cert — accept the browser warning).

Open: `https://localhost:8000/?key=YOUR_GEMINI_API_KEY`

**Or** create a `keys.json` file in the project root (gitignored):

```json
{
  "gemini": {
    "apiKey": "YOUR_GEMINI_API_KEY"
  }
}
```

Then open `https://localhost:8000` without the query param.

> **WebXR / camera testing on a headset:** The dev server binds to your local network. Find your machine's IP in the terminal output and open `https://YOUR_IP:8000/?key=...` on the device. Accept the cert warning on the device too.

### Why `@web/dev-server` and not Vite

Vite rewrites ES module imports before the browser sees them, which breaks the browser-native importmap that resolves CDN packages. `@web/dev-server` is a transparent static server — it never touches imports.

---

## Deploying to GCP (Firebase Hosting)

The app is entirely static — no server needed. Firebase Hosting serves it over HTTPS with a CDN.

### First-time setup

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

When prompted:
- **Project:** select or create your GCP/Firebase project
- **Public directory:** `.` (the project root)
- **Single-page app:** No
- **Overwrite `index.html`:** No

This generates `.firebaserc` with your project ID. A `firebase.json` is already included in the repo.

### Deploy

```bash
firebase deploy
```

Your app will be live at `https://YOUR_PROJECT_ID.web.app`.

### API key in production

Pass the key as a URL query param:

```
https://YOUR_PROJECT_ID.web.app/?key=YOUR_GEMINI_API_KEY
```

> **Note:** For a private demo, share the URL with the key included. For anything beyond internal use, set up a backend proxy instead of exposing the key in the URL.

---

## Project structure

```
pack-pro/
├── src/
│   ├── main.js                   # App bootstrap
│   ├── GeminiManager.js          # Session lifecycle, phase FSM, tools
│   ├── PackingListPanel.js       # Checklist panel (items, packed state)
│   ├── WelcomePanel.js           # Intro screen with Start button
│   ├── TranscriptionManager.js   # Live conversation display
│   ├── SpatialAnchorManager.js   # Corner bracket overlay on detected bag
│   ├── systemPrompt.js           # Porter's system prompt
│   ├── constants.js              # PHASES, CATEGORIES, feature flags
│   └── tools/                    # Gemini function calling tools
│       ├── setPackingList.js     # Build initial list in one call
│       ├── addItem.js
│       ├── removeItem.js
│       ├── renameItem.js
│       ├── setItemPacked.js      # Mark item packed/unpacked
│       ├── transitionPhase.js    # Advance phase FSM
│       └── requestCameraSnapshot.js  # Trigger burst mode
├── index.html                    # Importmap + entry point
├── firebase.json                 # Firebase Hosting config
├── web-dev-server.config.mjs     # Dev server config
└── package.json
```

## Feature flags

`src/constants.js` contains toggle flags:

| Flag | Default | Description |
|------|---------|-------------|
| `SPATIAL_ANCHOR_ENABLED` | `true` | Runs object detection on PACKING entry and places corner bracket overlay on detected bag |

Set to `false` to disable without affecting anything else.

---

## Tech stack

- [xrblocks](https://github.com/google/xrblocks) — WebXR framework (spatial UI, camera, depth, object detection)
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) — real-time audio + vision + function calling
- [Three.js](https://threejs.org/) — 3D rendering
- [Troika](https://github.com/protectwise/troika) — SDF text rendering

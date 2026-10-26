# WasteWise — Sort smarter. Waste less.

A mobile-first waste-sorting assistant for homes, offices and neighbourhoods. Snap or describe
any item and Lulu tells you which bin it goes in and how to prepare it.

**How answers work:** Gemini identifies the item and writes the disposal rule for it: one of the
five bin categories in `src/data/binCategories.json` (dry, wet, hazardous, reject, e-waste, following
Indian segregation practice; it can't invent a new bin), up to four preparation steps and a short
explanation. If it isn't sure what the item is, it asks one clarifying question first. Every answer is
AI-generated; the app says so only in small print under results and in the chat.

## Stack

React 19 + TypeScript + Tailwind CSS v4 (Vite) · lucide-react · `@google/genai` (Gemini, JSON
structured output) · Firebase Anonymous Auth + Cloud Firestore · `cobe` globe.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

- `VITE_GEMINI_API_KEY`: from Google AI Studio. `VITE_GEMINI_MODEL` defaults to `gemini-2.5-flash`.
- `VITE_FIREBASE_*`: from Firebase Console → Project settings → Web app.
- `VITE_GOOGLE_MAPS_API_KEY`: Google Cloud key with the **Maps JavaScript API** enabled, for the dumps
  heatmap and the kabadiwala map. It ships to the browser, so restrict it to your site's URLs.
  `VITE_GOOGLE_MAPS_MAP_ID` is optional (pins use `DEMO_MAP_ID` without it).
- `GOOGLE_PLACES_API_KEY`: key with **Places API (New)** enabled. Only the server uses it (no `VITE_`
  prefix), for real kabadiwala and cleaning-service listings with ratings; the server only runs a fixed
  set of searches and caches them for 30 minutes. Without it, those screens fall back to
  OpenStreetMap and Google Maps search links.

Keys live only in `.env.local`, which is git-ignored. Vite still bundles `VITE_*` values into the
client JavaScript, so anyone using the app can see them. Restrict the Gemini key (HTTP referrers +
API restriction) in Google Cloud, and rely on the Firestore rules below for Firebase.

**Without Firebase settings** the app still works: points and levels are kept on this device and the
leaderboard shows "not connected". No placeholder or fake numbers are ever shown.

### Firebase

1. Create a project, add a Web app, and copy its config into `.env.local`.
2. Authentication → Sign-in method → enable **Anonymous**, **Email/Password** and **Google**.
3. Create a Cloud Firestore database.
4. Deploy the rules and indexes: `npx firebase-tools deploy --only firestore` (uses `firebase.json`,
   `firestore.rules`, `firestore.indexes.json`). Index builds take a few minutes; until then the
   leaderboard shows a "still being created" message.

### Accounts

Everyone starts as an anonymous guest, so scanning and points work without signing up. From
Profile (or **Sign in** in the desktop top bar) people can create an account with email and
password or Google; this upgrades the guest in place, so the same uid, points and leaderboard name
carry over. Signing in to an existing account on another device switches to that account's
profile. Sign out returns to a fresh guest. Scan history stays on each device. The code is in
`src/lib/auth.ts` and `src/screens/AccountScreen.tsx`.

To try accounts without touching the real project, run the Firebase Auth emulator
(`npx firebase-tools emulators:start --only auth`, configured in `firebase.json`) and start the app
with `VITE_FIREBASE_AUTH_EMULATOR=http://127.0.0.1:9099`. Firestore still points at the real
project, which won't accept emulator sign-ins, so profiles fall back to on-device storage there.

## Bins, areas and sample data

- `src/data/binCategories.json`: the five bins (id, label, bin colour). Sent to Gemini with every scan.
- `src/lib/teams.ts`: area teams for the leaderboard (Sohna, Badshahpur, …). Add a line per new area.
- `src/data/pickups.ts`: collection times per area. **Sample schedule**: replace with real times.
- `src/data/bins.ts`: public bin positions for the bin map. **Sample positions** around Sohna.

## Where things are

| Area | Files |
| --- | --- |
| Screens | `src/screens/*` (Home, Scan, History, Leaderboard, Profile) |
| Scan flow and bin decisions | `src/lib/flow.ts`, `src/lib/categories.ts`, `src/lib/gemini.ts` |
| Image resize / thumbnails | `src/lib/image.ts` |
| Camera + upload (shared by screens and chat) | `src/state/capture.tsx` |
| Lulu chat | `src/chat/LuluChat.tsx` |
| Points, limits, streaks | `src/lib/points.ts` |
| Profile storage (Firestore or local) | `src/lib/store.ts` |
| Leaderboard queries | `src/lib/leaderboard.ts` |
| Ready-made components (unchanged) | `src/components/ui/LuluMascot.tsx`, `src/components/ui/cobe-globe-live.tsx` |

## Pages

- `/`: the WasteWise landing page (`index.html` + `hero/style.css`, `hero/script.js`). Plain HTML/CSS/JS:
  a 1440×1080 frame scaled with `--u = min(100vw/1440, 100vh/1080)`, with a curved, draggable carousel
  of everyday waste items and their bins. Every button opens the app. Phones (≤ 820px)
  get a stacked layout.
- `/app.html`: the WasteWise React app (`app.html` → `src/main.tsx`), in the same mint studio style as the landing page
  (off-white page, forest green, mint badges, Inter Tight headlines, Caveat notes). The shared
  surfaces live in `src/index.css` (`.glass` cards, `.pill` / `.pill-glass` buttons, `.badge-mint`, `.note`).
- App screens have addresses, so links open them directly: `/app.html#scan`, `#bins` (bin map), `#impact`,
  `#leaderboard`, `#history`, `#profile`, and `#lulu` (opens the chat). The browser back
  button moves between screens.
- `skyprompt/`: the earlier Skyprompt hero, kept for reference (dev server: `/skyprompt/`). It uses
  `public/media/scene.mp4` and the fonts in `hero/fonts/`.

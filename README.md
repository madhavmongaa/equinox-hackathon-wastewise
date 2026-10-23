# WasteWise — Sort smarter. Waste less.

A mobile-first AI waste-sorting assistant for the Zenith School of AI campus.

**Core principle: Gemini identifies the item. The guide decides the bin first; Gemini fills the gaps.**
When the guide covers the item, the model returns a `rule_id`. The app checks it against
`src/data/wasteGuide.json` and shows the category, preparation steps and quoted rule text from the
guide file, never from the model's wording.

When the guide has no matching rule, the model writes its own `generated_rule`: one of the guide's
categories (it can't invent a new bin), up to four preparation steps and a short explanation. The
app shows it as a normal result, labelled **"AI-suggested · not in the campus guide"** instead of a
guide section number, so official wording and model wording are never confused. The app only says
"Local disposal rule not found" when the item stays unclear after the clarifying questions.

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

Keys live only in `.env.local`, which is git-ignored. Vite still bundles `VITE_*` values into the
client JavaScript, so anyone using the app can see them. Restrict the Gemini key (HTTP referrers +
API restriction) in Google Cloud, and rely on the Firestore rules below for Firebase.

**Without Firebase settings** the app still works: points and levels are kept on this device and the
leaderboard shows "not connected". No placeholder or fake numbers are ever shown.

### Firebase

1. Create a project, add a Web app, and copy its config into `.env.local`.
2. Authentication → Sign-in method → enable **Anonymous**.
3. Create a Cloud Firestore database.
4. Deploy the rules and indexes: `npx firebase-tools deploy --only firestore` (uses `firebase.json`,
   `firestore.rules`, `firestore.indexes.json`). Index builds take a few minutes; until then the
   leaderboard shows a "still being created" message.

## The waste guide

`src/data/wasteGuide.json` holds the campus guide. **The current file is a draft with sample
wording.** Replace every `source_text` with the exact sentences from the official Zenith guide
before the demo, and delete any item the guide doesn't cover. The whole file is sent to Gemini as
part of the system instruction. Items you delete aren't lost: Gemini answers them with an
AI-suggested rule instead.

## Where things are

| Area | Files |
| --- | --- |
| Screens | `src/screens/*` (Home, Scan, History, Leaderboard, Profile) |
| Scan flow, guide validation + AI-suggested rules | `src/lib/flow.ts`, `src/lib/guide.ts`, `src/lib/gemini.ts` |
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
  of waste-item cards taken from the campus waste guide. Every button opens the app. Phones (≤ 820px)
  get a stacked layout.
- `/app.html`: the WasteWise React app (`app.html` → `src/main.tsx`), in the same mint studio style as the landing page
  (off-white page, forest green, mint badges, Inter Tight headlines, Caveat notes). The shared
  surfaces live in `src/index.css` (`.glass` cards, `.pill` / `.pill-glass` buttons, `.badge-mint`, `.note`).
- App screens have addresses, so links open them directly: `/app.html#scan`, `#guide` (read-only view of
  the waste guide), `#leaderboard`, `#history`, `#profile`, and `#lulu` (opens the chat). The browser back
  button moves between screens.
- `skyprompt/`: the earlier Skyprompt hero, kept for reference (dev server: `/skyprompt/`). It uses
  `public/media/scene.mp4` and the fonts in `hero/fonts/`.

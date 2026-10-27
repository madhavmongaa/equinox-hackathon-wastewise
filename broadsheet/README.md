# WasteWise · The Broadsheet

The new WasteWise landing page: a moving newspaper. Plain HTML, CSS and JS, no build step.
The original app repo (`equinox-hackathon-wastewise`) is untouched; this is a separate site.

## Run it

```bash
npx serve .          # or: python3 -m http.server 4500
```

Open http://localhost:4500.

## The two settings you'll want to change

Both live at the top of `site.js`, or set them in a `<script>` before `site.js`:

| Setting | Default | What it does |
| --- | --- | --- |
| `WW_APP_BASE` | `/app.html` | Where the app lives. Every "Try scan now" and app link uses it, e.g. `/app.html#scan`. Works as-is if this page becomes the app's `index.html`. Otherwise set the deployed URL. |
| `WW_GAME_URL` | empty | The 3D game. Until it's set, "Play the game" opens the app. |

```html
<script>window.WW_APP_BASE = "https://your-domain/app.html"; window.WW_GAME_URL = "https://your-game";</script>
```

## What's in the paper

| Section | What it shows | How it moves |
| --- | --- | --- |
| A1 Front Page | Masthead, headline, Lulu climbing out of her photo | Layered paper planes at different rates |
| A2 Dear Lulu | Everyday bin questions with Lulu's answers | Quiet. Fades in once |
| A3 The Press | The scan: photo prints off a roller, items outlined in bin colours, steps per item | Pinned. Scroll turns the roller |
| A4 World Desk | Globe to Sohna, severity heatmap, sweeper route, a report ticket | Sideways rail |
| A5 Sports & Games | Game slot, levels, points table, weekly challenges, area teams | Iris reveal |
| A6 Classifieds | Kabadiwala, cleaners, dumps, municipal dashboard, crews, bins, reminders, offline, impact, Lulu | Dense columns |
| Coupon | "Try scan now." cut out by scissors | Pinned close |

Numbers on the page all come from the app's code (points, levels, scrap rates). The map, heatmap
and ticket are labelled as sample data.

## Files

- `index.html`, `site.css`, `site.js`: the page. Edit these.
- `scrollcraft.js`, `scrollcraft.css`: the scroll engine. Don't edit; theme it from `site.css`.
- `fonts/`: Newsreader and Archivo, self-hosted (SIL Open Font License).
- `assets/land-dots.js`: globe dots from Natural Earth (public domain). Rebuild with `node tools/landdots.mjs` after `npm i world-atlas topojson-client d3-geo`.
- `BRIEF.md`: the design brief this was built from.

Reduced-motion visitors get every section complete and still, and the world rail becomes a normal sideways scroll.

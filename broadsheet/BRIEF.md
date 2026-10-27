# WasteWise — The Broadsheet (scroll-craft brief)

Interviewed with Madhav on 2026-10-27. Verbatim answers are quoted. Where he
delegated ("you can reorder tabs and features ... according to what u feel would
be more catchy"), the decision is labelled **Authored under delegation**.

## Source material (inspected, not assumed)

- Original repo: `equinox-hackathon-wastewise` (React app at `/app.html`, landing at `/`). Read only; untouched.
- Brand kept as asked: the leaf-in-arrow logo, forest green `#08482D`, mint `#DAE7C7`, mint page `#F5F8EF`, Lulu (paper coffee cup, green lid, sage sleeve with leaf, dark visor, mint eyes) ported 1:1 from `LuluMascot.tsx`.
- Real features found in code: photo/describe scan (Gemini) with multi-item segmentation and bin-colour tags, 5 bins (dry/blue, wet/green, hazardous/red, reject/grey, e-waste box), up to 4 prep steps, a clarifying question when unsure, Lulu chat, English/Hindi, voice, offline queue + installable, bin map, pickup reminders (sample schedule), illegal dump reports with severity + heatmap + globe hotspots, municipal community dashboard, government report tickets, sweeper queue, kabadiwala (scrap dealers, rough ₹/kg rates), cleaning services (Sohna/Gurugram), impact (CO₂e per week), points/levels/badges, weekly challenges, area teams.
- Not in the repo: the 3D game. Madhav says it lives elsewhere. Its chapter is built with a slot to drop it in.
- No numbers on this page that the app does not define. Heatmap/globe use clearly labelled sample positions. No counters.

## The eight topics

1. **Vibe** — "premium, trusted", "more editorial rather than a bunch of different AI-generated assets", "like a moving newspaper kinda thingy", "calm but eye catching". References: a newspaper whose pictures move.
2. **Journey, his order** — "open the website and then feel oh wow what is this about / then they see the scan feature which comes in rolling and blows their mind away / then the globe and the heatmap come in / then the 3d game comes in / then the services hit".
3. **Energy** — "calm but eye catching so the user stays".
4. **Feeling + the one moment** — "they should describe it as mind blowing and MUST GIVE IT A TRY thing". Peak: the scan rolling in.
5. **Unlike any site** — "tell a story which is not really a story but a sequence of tabs and features so that the user sticks to the website even if they dont plan on staying".
6. **Range** — Editorial (his word). Not premium-minimal dark, not a world.
7. **One world or scenes** — Scenes: "not like a world that we'd be flying through".
8. **Assets** — "keep the green colours and all the features", "the logo as well", "YES LULU IS A MUST". No photography supplied; he explicitly does not want a pile of generated imagery, so nothing is generated. Imagery is drawn in the page (SVG/canvas engraving style) from the app's real content.

Audience (Step 1): "it is a website built for services and ngos"; "This site was for a hackathon but now we're planning to actually scale it further". One action: **"Try scan now."** used as the label everywhere.

## Grammar

**Chaptered editorial, set as a broadsheet.** Chapters are newspaper sections (Front Page, Dear Lulu, The Press, World Desk, Sports & Games, Classifieds), each on its own hard-cut ground. Folio in the margin instead of a nav bar. Title-page hero (the front page). Close is a clip-out coupon + colophon, CTA as a line of type inside it.

## Journey (reordered under delegation)

1. Front page — curiosity: a newspaper about your bin, with Lulu standing on the fold.
2. Dear Lulu — recognition: the questions everyone actually has (pizza box? dead battery?). Quiet before the peak.
3. The Press — awe (peak): the scan rolls off a printing cylinder under your hand.
4. World Desk — scale: planet to Sohna street, the dump heatmap and the sweeper route.
5. Sports & Games — delight: the 3D game slot, levels, weekly challenges, area teams.
6. Classifieds — confidence: every service an NGO/municipal team can use, as dense small ads.
7. The coupon — resolve: "Try scan now." clipped out, Lulu signs off.

Why services moved last and Lulu moved forward: services are information (compress them), Lulu is the voice that makes the peak personal.

## Feeling curve

```
1 Curiosity    a real newspaper front page about bins, its picture (Lulu) moving on the fold
2 Recognition  small letters, honest everyday questions, Lulu's short replies; nothing moves
3 Awe          a cylinder rolls and prints a photo of a cluttered tray, each item gets outlined in its bin colour and the verdict prints
4 Scale        a globe turns to India, slides into a street map warming with dump reports
5 Delight      a game page, levels from Seedling to Forest Guardian, challenges to beat
6 Confidence   dense classifieds: scrap dealers, cleaners, crews, municipal desk, all real
7 Resolve      everything stops on one coupon with one line on it
```

## The peak

> "you scroll and the page literally prints itself off a roller, and then it circles every item in the photo and tells you which bin"

Lives in chapter 3 (The Press). Largest span on the page. Chapter 2 is the authored quiet in front of it.

## Tell-someone sentence

It's the site where **the scan prints itself off a press under your thumb, then sorts everything in the picture.**

## Signature move

**The press.** A printing cylinder at the head of the chapter; scroll turns it and the sheet feeds out beneath it, printed as it emerges. Then a scan line crosses the printed photo, item outlines draw themselves and bin tags are stamped. Bespoke page JS on `--sc-p`; engine untouched.

## Authored silence

The end of "Dear Lulu" and the first ~8% of The Press (dark ground, roller only) are deliberate quiet, not dead scroll.

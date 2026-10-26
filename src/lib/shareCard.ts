// Shareable square images (1080×1080) drawn on a canvas: your impact, your week's
// challenges, or a cleaned dump's before/after. Shared through the phone's share sheet
// when it accepts files, otherwise downloaded.

const SIZE = 1080
const GREEN = "#08482D"
const MINT = "#DAE7C7"
const PAGE = "#F5F8EF"

export type ShareCard =
  | { kind: "impact"; co2: string; landfill: string; items: number; trees: string }
  | { kind: "week"; done: number; total: number; titles: string[]; points: number }
  | { kind: "cleanup"; title: string; kg: string; before: string; after?: string }

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.referrerPolicy = "no-referrer"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s
  const sh = h / s
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

async function draw(card: ShareCard): Promise<HTMLCanvasElement> {
  await document.fonts?.ready
  const c = document.createElement("canvas")
  c.width = c.height = SIZE
  const ctx = c.getContext("2d")!
  ctx.fillStyle = PAGE
  ctx.fillRect(0, 0, SIZE, SIZE)
  const display = (px: number) => `700 ${px}px "Inter Tight", Inter, sans-serif`
  const body = (px: number, w = 500) => `${w} ${px}px Inter, sans-serif`

  // footer brand
  ctx.fillStyle = GREEN
  ctx.font = display(44)
  ctx.fillText("WasteWise", 80, SIZE - 80)
  ctx.font = body(28)
  ctx.fillStyle = "#5E5E61"
  ctx.fillText("Sort smarter. Waste less.", 80, SIZE - 40)

  if (card.kind === "impact" || card.kind === "week") {
    roundRect(ctx, 60, 60, SIZE - 120, 640, 48)
    ctx.fillStyle = GREEN
    ctx.fill()
    ctx.fillStyle = MINT
    ctx.font = body(32, 700)
    ctx.fillText(card.kind === "impact" ? "MY SORTING IMPACT" : "THIS WEEK'S CHALLENGES", 120, 150)
    ctx.fillStyle = "#fff"
    if (card.kind === "impact") {
      ctx.font = display(170)
      ctx.fillText(card.co2, 115, 330)
      ctx.font = body(40)
      ctx.fillText("CO₂e saved", 120, 395)
      ctx.font = display(80)
      ctx.fillText(card.landfill, 120, 530)
      ctx.font = body(36)
      ctx.fillStyle = "rgba(255,255,255,0.8)"
      ctx.fillText("kept out of landfill", 120, 585)
      ctx.fillText(`${card.items} items sorted · ${card.trees}`, 120, 650)
    } else {
      ctx.font = display(200)
      ctx.fillText(`${card.done}/${card.total}`, 115, 350)
      ctx.font = body(40)
      ctx.fillText(`challenges done · +${card.points} points`, 120, 420)
      ctx.font = body(34)
      ctx.fillStyle = "rgba(255,255,255,0.85)"
      card.titles.slice(0, 4).forEach((title, i) => ctx.fillText(`✓ ${title}`, 120, 500 + i * 50))
    }
    // tagline
    ctx.fillStyle = "#101410"
    ctx.font = display(64)
    ctx.fillText(card.kind === "impact" ? "Every item sorted right" : "Sorting right, all week", 80, 810)
    ctx.fillText("helps the campus 🌱", 80, 885)
  } else {
    const [before, after] = await Promise.all([loadImage(card.before), card.after ? loadImage(card.after) : Promise.resolve(null)])
    const w = (SIZE - 160 - 20) / 2
    const panels: [HTMLImageElement | null, string][] = [
      [before, "BEFORE"],
      [after, "AFTER"],
    ]
    panels.forEach(([img, label], i) => {
      const x = 80 + i * (w + 20)
      ctx.save()
      roundRect(ctx, x, 80, w, 600, 36)
      ctx.clip()
      ctx.fillStyle = i ? GREEN : "#d9ddd5"
      ctx.fillRect(x, 80, w, 600)
      if (img) cover(ctx, img, x, 80, w, 600)
      else if (i) {
        ctx.fillStyle = "#fff"
        ctx.font = display(64)
        ctx.fillText("Cleared ✓", x + 60, 400)
      }
      ctx.restore()
      ctx.fillStyle = i ? GREEN : "rgba(0,0,0,0.6)"
      roundRect(ctx, x + 24, 104, 150, 52, 26)
      ctx.fill()
      ctx.fillStyle = "#fff"
      ctx.font = body(26, 700)
      ctx.fillText(label, x + 46, 140)
    })
    ctx.fillStyle = "#101410"
    ctx.font = display(56)
    const title = card.title.length > 34 ? card.title.slice(0, 33) + "…" : card.title
    ctx.fillText(title, 80, 770)
    ctx.font = body(38)
    ctx.fillStyle = GREEN
    ctx.fillText(`${card.kg} of waste cleared near campus`, 80, 835)
  }
  return c
}

/** Draws the card and shares (or downloads) it. Returns how it went. */
export async function shareCard(card: ShareCard): Promise<"shared" | "downloaded" | "cancelled"> {
  const canvas = await draw(card)
  let blob: Blob | null = null
  try {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"))
  } catch {
    // a photo without CORS permission "taints" the canvas: draw again without photos
    if (card.kind === "cleanup") return shareCard({ ...card, before: "", after: undefined })
  }
  if (!blob) throw new Error("Couldn't make the image")
  const file = new File([blob], `wastewise-${card.kind}.png`, { type: "image/png" })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "WasteWise", text: "Sorting right with WasteWise 🌱" })
      return "shared"
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled"
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return "downloaded"
}

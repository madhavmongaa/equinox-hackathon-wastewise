// Masks and outlines for multi-item scans. Gemini gives a box per item; the item's
// shape inside that box is found here by separating it from the background around it.

import type { Box } from "@/lib/types"

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("decode"))
    img.src = src
  })
}

interface PxBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

function toPx(box: Box, w: number, h: number): PxBox {
  return {
    x0: Math.floor(box.left * w),
    y0: Math.floor(box.top * h),
    x1: Math.min(w, Math.ceil(box.right * w)),
    y1: Math.min(h, Math.ceil(box.bottom * h)),
  }
}

/** Colours just outside the box (or on its edge, near the image border), used as the background. */
function backgroundSamples(data: Uint8ClampedArray, w: number, h: number, b: PxBox) {
  const pad = Math.max(4, Math.round(Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.04))
  const samples: number[][] = []
  const step = Math.max(1, Math.round(((b.x1 - b.x0) + (b.y1 - b.y0)) / 120))
  const take = (x: number, y: number) => {
    const cx = Math.min(w - 1, Math.max(0, x))
    const cy = Math.min(h - 1, Math.max(0, y))
    const i = (cy * w + cx) * 4
    samples.push([data[i], data[i + 1], data[i + 2]])
  }
  for (let x = b.x0; x < b.x1; x += step) {
    take(x, b.y0 - pad)
    take(x, b.y1 - 1 + pad)
  }
  for (let y = b.y0; y < b.y1; y += step) {
    take(b.x0 - pad, y)
    take(b.x1 - 1 + pad, y)
  }
  return samples
}

/**
 * Square dilation (grow) or erosion (shrink) of a 0/1 mask by `r` px. Outside the box
 * counts as empty when growing and as filled when shrinking, so items touching the
 * box edge keep their edge.
 */
function morph(src: Uint8Array, bw: number, bh: number, r: number, grow: boolean) {
  const pass = (input: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(input.length)
    const lines = horizontal ? bh : bw
    const len = horizontal ? bw : bh
    const at = (line: number, i: number) => (horizontal ? line * bw + i : i * bw + line)
    const prefix = new Int32Array(len + 1)
    for (let line = 0; line < lines; line++) {
      for (let i = 0; i < len; i++) prefix[i + 1] = prefix[i] + input[at(line, i)]
      for (let i = 0; i < len; i++) {
        const a = Math.max(0, i - r)
        const b = Math.min(len - 1, i + r)
        const ones = prefix[b + 1] - prefix[a]
        out[at(line, i)] = grow ? (ones > 0 ? 1 : 0) : ones === b - a + 1 ? 1 : 0
      }
    }
    return out
  }
  return pass(pass(src, true), false)
}

/**
 * Item mask for one box: 1 where the pixel differs from the surrounding background.
 * Returns null when the result doesn't look like an object (then the box is drawn instead).
 */
function maskFor(data: Uint8ClampedArray, w: number, h: number, b: PxBox): Uint8Array | null {
  const bw = b.x1 - b.x0
  const bh = b.y1 - b.y0
  if (bw < 8 || bh < 8) return null
  const bg = backgroundSamples(data, w, h, b)
  const T2 = 42 * 42
  const raw = new Uint8Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = ((b.y0 + y) * w + (b.x0 + x)) * 4
      const r = data[i], g = data[i + 1], bl = data[i + 2]
      let near = false
      for (const s of bg) {
        const dr = r - s[0], dg = g - s[1], db = bl - s[2]
        if (dr * dr + dg * dg + db * db < T2) {
          near = true
          break
        }
      }
      raw[y * bw + x] = near ? 0 : 1
    }
  }

  // smooth: majority vote in a small window
  const rad = Math.max(1, Math.round(Math.min(bw, bh) / 120))
  const mask = new Uint8Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      let on = 0, all = 0
      for (let dy = -rad; dy <= rad; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= bh) continue
        for (let dx = -rad; dx <= rad; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= bw) continue
          all++
          on += raw[yy * bw + xx]
        }
      }
      mask[y * bw + x] = on * 2 > all ? 1 : 0
    }
  }

  // close small gaps (e.g. a white label next to a pale background), so the outline
  // follows the whole item rather than breaking up around light patches
  const close = Math.max(2, Math.round(Math.min(bw, bh) * 0.035))
  mask.set(morph(morph(mask, bw, bh, close, true), bw, bh, close, false))

  // fill holes: background is whatever off-pixel is reachable from the box edge
  const seen = new Uint8Array(bw * bh)
  const stack: number[] = []
  const push = (p: number) => {
    if (!seen[p] && !mask[p]) {
      seen[p] = 1
      stack.push(p)
    }
  }
  for (let x = 0; x < bw; x++) {
    push(x)
    push((bh - 1) * bw + x)
  }
  for (let y = 0; y < bh; y++) {
    push(y * bw)
    push(y * bw + bw - 1)
  }
  while (stack.length) {
    const p = stack.pop()!
    const x = p % bw, y = (p - x) / bw
    if (x > 0) push(p - 1)
    if (x < bw - 1) push(p + 1)
    if (y > 0) push(p - bw)
    if (y < bh - 1) push(p + bw)
  }
  let on = 0
  for (let p = 0; p < mask.length; p++) {
    if (!seen[p]) mask[p] = 1
    on += mask[p]
  }
  const coverage = on / mask.length
  return coverage < 0.08 || coverage > 0.97 ? null : mask
}

interface PreparedItem {
  b: PxBox
  /** white where the item is */
  fill: HTMLCanvasElement
  /** white on the item's inner edge */
  edge: HTMLCanvasElement
}

export interface PreparedSegments {
  w: number
  h: number
  line: number
  /** same order as the boxes passed in; null where there was no box */
  items: (PreparedItem | null)[]
}

function blank(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = Math.max(1, w)
  c.height = Math.max(1, h)
  return c
}

function fromMask(mask: Uint8Array, b: PxBox, line: number): PreparedItem {
  const bw = b.x1 - b.x0
  const bh = b.y1 - b.y0
  const fill = blank(bw, bh)
  const edge = blank(bw, bh)
  const fctx = fill.getContext("2d")!
  const ectx = edge.getContext("2d")!
  const fi = fctx.createImageData(bw, bh)
  const ei = ectx.createImageData(bw, bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const p = y * bw + x
      if (!mask[p]) continue
      fi.data[p * 4 + 3] = 255
      fi.data[p * 4] = fi.data[p * 4 + 1] = fi.data[p * 4 + 2] = 255
      let isEdge = false
      for (let d = 1; d <= line && !isEdge; d++) {
        if (x - d < 0 || x + d >= bw || y - d < 0 || y + d >= bh) isEdge = true
        else if (!mask[p - d] || !mask[p + d] || !mask[p - d * bw] || !mask[p + d * bw]) isEdge = true
      }
      if (isEdge) {
        ei.data[p * 4 + 3] = 255
        ei.data[p * 4] = ei.data[p * 4 + 1] = ei.data[p * 4 + 2] = 255
      }
    }
  }
  fctx.putImageData(fi, 0, 0)
  ectx.putImageData(ei, 0, 0)
  return { b, fill, edge }
}

function fromBox(b: PxBox, line: number): PreparedItem {
  const bw = b.x1 - b.x0
  const bh = b.y1 - b.y0
  const r = Math.min(22, bw / 6, bh / 6)
  const fill = blank(bw, bh)
  const edge = blank(bw, bh)
  const fctx = fill.getContext("2d")!
  fctx.fillStyle = "#fff"
  fctx.beginPath()
  fctx.roundRect(0, 0, bw, bh, r)
  fctx.fill()
  const ectx = edge.getContext("2d")!
  ectx.strokeStyle = "#fff"
  ectx.lineWidth = line
  ectx.beginPath()
  ectx.roundRect(line / 2, line / 2, bw - line, bh - line, r)
  ectx.stroke()
  return { b, fill, edge }
}

/** Finds each item's shape once per photo; render it (and re-render on highlight) with renderSegments. */
export async function prepareSegments(src: string, boxes: (Box | null)[]): Promise<PreparedSegments> {
  const img = await loadImage(src)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const work = document.createElement("canvas")
  work.width = w
  work.height = h
  const wctx = work.getContext("2d", { willReadFrequently: true })!
  wctx.drawImage(img, 0, 0)
  const data = wctx.getImageData(0, 0, w, h).data
  const line = Math.max(4, Math.round(Math.max(w, h) / 170))
  const items = boxes.map((box) => {
    if (!box) return null
    const b = toPx(box, w, h)
    if (b.x1 - b.x0 < 4 || b.y1 - b.y0 < 4) return null
    const mask = maskFor(data, w, h, b)
    return mask ? fromMask(mask, b, line) : fromBox(b, line)
  })
  return { w, h, line, items }
}

const scratch = typeof document !== "undefined" ? document.createElement("canvas") : null

/** Draws `src` (a white shape) in `color` at the item's position. */
function drawTinted(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, y: number, color: string) {
  if (!scratch) return
  scratch.width = src.width
  scratch.height = src.height
  const s = scratch.getContext("2d")!
  s.globalCompositeOperation = "source-over"
  s.drawImage(src, 0, 0)
  s.globalCompositeOperation = "source-in"
  s.fillStyle = color
  s.fillRect(0, 0, src.width, src.height)
  ctx.drawImage(scratch, x, y)
}

/**
 * Spotlight overlay: the background is dimmed, every item stays bright with a light
 * tint, a white halo and an outline in its colour. With `active` set, that item glows
 * and the others recede.
 */
export function renderSegments(canvas: HTMLCanvasElement, prep: PreparedSegments, colors: string[], active: number | null) {
  const { w, h, line, items } = prep
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.save()
  ctx.clearRect(0, 0, w, h)

  ctx.fillStyle = "rgba(10, 14, 12, 0.55)"
  ctx.fillRect(0, 0, w, h)
  // lift the dim off each item, with a soft feathered edge around it
  ctx.globalCompositeOperation = "destination-out"
  items.forEach((it, i) => {
    if (!it) return
    ctx.globalAlpha = active === null || active === i ? 1 : 0.45
    ctx.filter = `blur(${line * 2}px)`
    ctx.drawImage(it.fill, it.b.x0, it.b.y0)
    ctx.filter = "none"
    ctx.drawImage(it.fill, it.b.x0, it.b.y0)
  })
  ctx.globalCompositeOperation = "source-over"

  items.forEach((it, i) => {
    if (!it) return
    ctx.globalAlpha = active === null ? 0.2 : active === i ? 0.28 : 0.08
    drawTinted(ctx, it.fill, it.b.x0, it.b.y0, colors[i])
  })

  const halo = Math.max(2, Math.round(line * 0.55))
  const order = items.map((_, i) => i).sort((a, b) => (a === active ? 1 : b === active ? -1 : 0))
  for (const i of order) {
    const it = items[i]
    if (!it) continue
    const dimmed = active !== null && active !== i
    ctx.globalAlpha = dimmed ? 0.45 : 0.95
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
      drawTinted(ctx, it.edge, it.b.x0 + dx * halo, it.b.y0 + dy * halo, "#ffffff")
    }
    ctx.globalAlpha = dimmed ? 0.5 : 1
    if (active === i) {
      ctx.shadowColor = colors[i]
      ctx.shadowBlur = line * 5
    }
    drawTinted(ctx, it.edge, it.b.x0, it.b.y0, colors[i])
    ctx.shadowBlur = 0
  }
  ctx.restore()
}

/** Square-ish JPEG thumbnail of one item, max 200px, cut from the photo. */
export async function cropThumbnail(src: string, box: Box, maxEdge = 200): Promise<string> {
  const img = await loadImage(src)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const padX = (box.right - box.left) * 0.08
  const padY = (box.bottom - box.top) * 0.08
  const x0 = Math.max(0, (box.left - padX) * w)
  const y0 = Math.max(0, (box.top - padY) * h)
  const x1 = Math.min(w, (box.right + padX) * w)
  const y1 = Math.min(h, (box.bottom + padY) * h)
  const scale = Math.min(1, maxEdge / Math.max(x1 - x0, y1 - y0))
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round((x1 - x0) * scale))
  c.height = Math.max(1, Math.round((y1 - y0) * scale))
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height)
  return c.toDataURL("image/jpeg", 0.8)
}

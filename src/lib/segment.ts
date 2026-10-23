// Masks and outlines for multi-item scans. Gemini gives a box per item; the item's
// shape inside that box is found here by separating it from the background around it.

import type { Box } from "@/lib/types"

export interface Segment {
  box: Box
  color: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("decode"))
    img.src = src
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
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

function drawMask(ctx: CanvasRenderingContext2D, mask: Uint8Array, b: PxBox, rgb: [number, number, number], line: number) {
  const bw = b.x1 - b.x0
  const bh = b.y1 - b.y0
  const img = ctx.createImageData(bw, bh)
  const px = img.data
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const p = y * bw + x
      if (!mask[p]) continue
      // edge: any pixel within `line` px that is outside the mask
      let edge = false
      for (let d = 1; d <= line && !edge; d++) {
        if (x - d < 0 || x + d >= bw || y - d < 0 || y + d >= bh) edge = true
        else if (!mask[p - d] || !mask[p + d] || !mask[p - d * bw] || !mask[p + d * bw]) edge = true
      }
      const i = p * 4
      px[i] = rgb[0]
      px[i + 1] = rgb[1]
      px[i + 2] = rgb[2]
      px[i + 3] = edge ? 255 : 105
    }
  }
  ctx.putImageData(img, b.x0, b.y0)
}

function drawBox(ctx: CanvasRenderingContext2D, b: PxBox, color: string, line: number) {
  const r = Math.min(18, (b.x1 - b.x0) / 6, (b.y1 - b.y0) / 6)
  ctx.beginPath()
  ctx.roundRect(b.x0 + line / 2, b.y0 + line / 2, b.x1 - b.x0 - line, b.y1 - b.y0 - line, r)
  ctx.globalAlpha = 0.4
  ctx.fillStyle = color
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.lineWidth = line
  ctx.strokeStyle = color
  ctx.stroke()
}

/** Draws each item's coloured mask and outline onto `canvas`, sized to the photo. */
export async function drawSegments(canvas: HTMLCanvasElement, src: string, segments: Segment[]) {
  const img = await loadImage(src)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const work = document.createElement("canvas")
  work.width = w
  work.height = h
  const wctx = work.getContext("2d", { willReadFrequently: true })!
  wctx.drawImage(img, 0, 0)
  const data = wctx.getImageData(0, 0, w, h).data

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, w, h)
  const line = Math.max(3, Math.round(Math.max(w, h) / 220))
  // largest first, so small items stay visible on top
  const ordered = [...segments].sort(
    (a, b) => (b.box.bottom - b.box.top) * (b.box.right - b.box.left) - (a.box.bottom - a.box.top) * (a.box.right - a.box.left)
  )
  for (const s of ordered) {
    const b = toPx(s.box, w, h)
    const mask = maskFor(data, w, h, b)
    if (mask) {
      // putImageData replaces pixels, so draw each mask through its own layer
      const layer = document.createElement("canvas")
      layer.width = w
      layer.height = h
      drawMask(layer.getContext("2d")!, mask, b, hexToRgb(s.color), line)
      ctx.drawImage(layer, 0, 0)
    } else {
      drawBox(ctx, b, s.color, line)
    }
  }
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

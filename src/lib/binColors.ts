// Colours for multi-item scans. Each bin keeps its real-world hue (blue bin = blue),
// in a brighter "vivid" tone that stands out on photos, a "deep" tone that carries
// white text, and a "soft" tint for backgrounds.

export interface BinTone {
  vivid: string
  deep: string
  soft: string
}

const TONES: Record<string, BinTone> = {
  dry: { vivid: "#2F80FF", deep: "#1453BF", soft: "#E7EFFF" },
  wet: { vivid: "#22C55E", deep: "#11743A", soft: "#E3F6E9" },
  hazardous: { vivid: "#FF4136", deep: "#C0261B", soft: "#FFE9E6" },
  reject: { vivid: "#94A3B8", deep: "#475569", soft: "#EEF1F5" },
  ewaste: { vivid: "#B05CFF", deep: "#7232C2", soft: "#F3EAFF" },
}

/** Items the app couldn't place in a bin. */
export const UNSORTED_TONE: BinTone = { vivid: "#FFAD1F", deep: "#A35F00", soft: "#FFF4DE" }

export function binTone(categoryId: string | null | undefined): BinTone {
  return (categoryId && TONES[categoryId]) || UNSORTED_TONE
}

function mix(hex: string, target: number, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (target - c) * amount))
  return "#" + ch.map((c) => c.toString(16).padStart(2, "0")).join("")
}

/**
 * Shade for the k-th item (0-based) in the same bin: the bin's own tone first,
 * then alternately lighter and darker, so items sharing a bin stay distinct.
 */
export function shadeFor(hex: string, k: number) {
  if (k === 0) return hex
  const step = Math.ceil(k / 2) * 0.22
  return k % 2 ? mix(hex, 255, Math.min(step, 0.5)) : mix(hex, 0, Math.min(step, 0.45))
}

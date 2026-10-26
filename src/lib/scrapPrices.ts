// Rough scrap prices for the "sell it" popup: typical kabadiwala rates around
// Gurugram (₹ per kg, they change with the market and the dealer) and a guessed
// weight for common items, so a single item gets an "about ₹X" estimate.

import type { ScrapKind } from "@/lib/scrap"

interface Rate {
  name: string
  match: RegExp
  kind: ScrapKind
  /** ₹ per kg, low–high */
  perKg: [number, number]
}

/** Most specific first: the first match wins. */
const RATES: Rate[] = [
  { name: "Copper", match: /\bcopper\b/i, kind: "metal", perKg: [600, 720] },
  { name: "Brass", match: /\b(brass|bronze)\b/i, kind: "metal", perKg: [350, 420] },
  { name: "Aluminium", match: /\b(alumin(i)?um|cans?|foil tray)\b/i, kind: "metal", perKg: [100, 130] },
  { name: "Steel", match: /\b(steel|utensils?)\b/i, kind: "metal", perKg: [35, 45] },
  { name: "Iron", match: /\b(iron|metal|rods?|pipes?|scrap|tin)\b/i, kind: "metal", perKg: [25, 32] },
  { name: "Newspaper", match: /\b(newspapers?|magazines?)\b/i, kind: "paper", perKg: [12, 16] },
  { name: "Books & notebooks", match: /\b(books?|notebooks?|office paper|paper)\b/i, kind: "paper", perKg: [10, 14] },
  { name: "Cardboard", match: /\b(cardboard|corrugated|cartons?|box(es)?)\b/i, kind: "paper", perKg: [7, 10] },
  { name: "PET bottles", match: /\b(pet|bottles?)\b/i, kind: "plastic", perKg: [12, 18] },
  { name: "Hard plastic", match: /\b(hdpe|pp|buckets?|crates?|jars?|containers?|chairs?|jerry ?cans?)\b/i, kind: "plastic", perKg: [15, 25] },
  { name: "Laptops & phones", match: /\b(laptops?|phones?|mobiles?|computers?)\b/i, kind: "ewaste", perKg: [80, 150] },
  { name: "Batteries", match: /\bbatter(y|ies)\b/i, kind: "ewaste", perKg: [60, 90] },
  { name: "Wires & chargers", match: /\b(cables?|chargers?|wires?)\b/i, kind: "ewaste", perKg: [40, 70] },
  { name: "Mixed e-waste", match: /./, kind: "ewaste", perKg: [20, 40] },
]

/** Typical weight of one item, in kg. */
const WEIGHTS: [RegExp, number][] = [
  [/\bcans?\b/i, 0.015],
  [/\bfoil tray\b/i, 0.01],
  [/\b(pet|plastic) bottles?\b|\bbottles?\b/i, 0.025],
  [/\bnewspapers?\b/i, 0.25],
  [/\bmagazines?\b/i, 0.2],
  [/\b(books?|notebooks?)\b/i, 0.3],
  [/\b(cardboard|cartons?|box(es)?)\b/i, 0.3],
  [/\b(buckets?|crates?)\b/i, 0.6],
  [/\b(jars?|containers?)\b/i, 0.08],
  [/\blaptops?\b/i, 2],
  [/\b(phones?|mobiles?)\b/i, 0.18],
  [/\bbatter(y|ies)\b/i, 0.05],
  [/\b(cables?|chargers?|wires?)\b/i, 0.12],
  [/\butensils?\b/i, 0.3],
]

export interface ScrapEstimate {
  material: string
  perKg: [number, number]
  /** ₹ for this one item, when we can guess its weight */
  item: [number, number] | null
}

/** Price guess for one scrap item, or null when there's no rate for it. */
export function estimateScrap(itemText: string, kinds: ScrapKind[]): ScrapEstimate | null {
  const rate = RATES.find((r) => kinds.includes(r.kind) && r.match.test(itemText))
  if (!rate) return null
  const kg = WEIGHTS.find(([re]) => re.test(itemText))?.[1]
  const item: [number, number] | null = kg ? [Math.max(1, Math.round(rate.perKg[0] * kg)), Math.max(1, Math.round(rate.perKg[1] * kg))] : null
  return { material: rate.name, perKg: rate.perKg, item }
}

export const rupees = ([lo, hi]: [number, number]) => (lo === hi ? `₹${lo}` : `₹${lo}–${hi}`)

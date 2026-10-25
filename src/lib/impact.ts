// Rough environmental impact of sorting, from scan history. These are estimates, shown
// as such: an average weight per item and the emissions saved per kg compared with
// the item going to landfill unsorted.

import { istWeekId } from "@/lib/dates"
import type { HistoryEntry } from "@/lib/types"

interface Factor {
  /** average kg per item */
  kg: number
  /** kg CO2e saved per kg sorted correctly */
  co2PerKg: number
  /** counts as kept out of landfill */
  diverted: boolean
}

export const IMPACT_FACTORS: Record<string, Factor> = {
  dry: { kg: 0.08, co2PerKg: 1.5, diverted: true },
  wet: { kg: 0.25, co2PerKg: 0.6, diverted: true },
  ewaste: { kg: 0.4, co2PerKg: 2.0, diverted: true },
  hazardous: { kg: 0.2, co2PerKg: 1.0, diverted: true },
  reject: { kg: 0.05, co2PerKg: 0, diverted: false },
  none: { kg: 0.1, co2PerKg: 0.3, diverted: false },
}

/** A grown tree takes in about 21 kg of CO2 a year. */
const TREE_KG_PER_DAY = 21 / 365
/** Cleaned dumps: mixed roadside waste, about 0.8 kg CO2e saved per kg recovered. */
export const DUMP_CO2_PER_KG = 0.8

export interface Impact {
  items: number
  kgSorted: number
  kgDiverted: number
  co2Kg: number
  treeDays: number
  byCategory: { id: string; items: number; kg: number; co2Kg: number }[]
  /** last 8 weeks, oldest first */
  weeks: { weekId: string; label: string; co2Kg: number; items: number }[]
}

export function impactOf(history: HistoryEntry[], now = new Date()): Impact {
  const cats: Record<string, { items: number; kg: number; co2Kg: number }> = {}
  let kgSorted = 0
  let kgDiverted = 0
  let co2Kg = 0
  const weekIds = Array.from({ length: 8 }, (_, i) => istWeekId(new Date(now.getTime() - (7 - i) * 7 * 86400000)))
  const weekly: Record<string, { co2Kg: number; items: number }> = Object.fromEntries(weekIds.map((w) => [w, { co2Kg: 0, items: 0 }]))

  for (const h of history) {
    const id = h.category_id && IMPACT_FACTORS[h.category_id] ? h.category_id : "none"
    const f = IMPACT_FACTORS[id]
    const co2 = f.kg * f.co2PerKg
    const c = (cats[id] ??= { items: 0, kg: 0, co2Kg: 0 })
    c.items++
    c.kg += f.kg
    c.co2Kg += co2
    kgSorted += f.kg
    if (f.diverted) kgDiverted += f.kg
    co2Kg += co2
    const w = weekly[istWeekId(new Date(h.timestamp))]
    if (w) {
      w.co2Kg += co2
      w.items++
    }
  }

  return {
    items: history.length,
    kgSorted,
    kgDiverted,
    co2Kg,
    treeDays: co2Kg / TREE_KG_PER_DAY,
    byCategory: Object.entries(cats)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.co2Kg - a.co2Kg),
    weeks: weekIds.map((w, i) => ({ weekId: w, label: i === 7 ? "This wk" : `W${w.split("-W")[1]}`, ...weekly[w] })),
  }
}

/** "1.2 kg", "350 g" */
export function formatKg(kg: number) {
  if (kg < 1) return `${Math.round(kg * 1000)} g`
  return `${kg < 10 ? kg.toFixed(1) : Math.round(kg).toLocaleString()} kg`
}

export function treeText(days: number) {
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} hours of a tree's work`
  if (days < 60) return `${Math.round(days)} days of a tree's work`
  return `${(days / 365).toFixed(1)} years of a tree's work`
}

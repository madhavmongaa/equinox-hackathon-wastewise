// The bins items are sorted into (Indian dry / wet / hazardous / reject / e-waste
// segregation). Which bin an item goes in is decided by the AI for every scan.

import categoriesJson from "@/data/binCategories.json"
import type { Category } from "@/lib/types"

export const CATEGORIES = categoriesJson as Category[]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: string | null | undefined): Category | null {
  if (!id) return null
  return byId.get(id) ?? null
}

/** rule_id stored with every answer (all of them are written by the AI). */
export const AI_RULE_ID = "ai"

/** Common items, offered as quick picks when correcting an identification. */
export const SUGGESTIONS = [
  "Plastic bottle",
  "Newspaper",
  "Cardboard box",
  "Banana peel",
  "Tea bag",
  "Greasy pizza box",
  "Glass jar",
  "Aluminium can",
  "Chips packet",
  "Used battery",
  "Old phone charger",
  "Sanitary pad",
]

export const categoriesJsonString = JSON.stringify(CATEGORIES)

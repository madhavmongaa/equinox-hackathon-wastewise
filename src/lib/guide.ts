import guideJson from "@/data/wasteGuide.json"
import type { Category, Rule, WasteGuide } from "@/lib/types"

export const guide = guideJson as WasteGuide

const rulesById = new Map(guide.rules.map((r) => [r.rule_id, r]))
const categoriesById = new Map(guide.categories.map((c) => [c.id, c]))

export function getRule(ruleId: string | null | undefined): Rule | null {
  if (!ruleId) return null
  return rulesById.get(String(ruleId).replace(/^§/, "").trim()) ?? null
}

export function getCategory(id: string | null | undefined): Category | null {
  if (!id) return null
  return categoriesById.get(id) ?? null
}

export function rulesForCategory(id: string): Rule[] {
  return guide.rules.filter((r) => r.category_id === id)
}

/** rule_id given to rules the model wrote itself because the guide had none. */
export const AI_RULE_ID = "ai"

export function ruleLabel(ruleId: string) {
  if (ruleId === AI_RULE_ID) return "AI-suggested · not in the campus guide"
  return `Campus Waste Guide §${ruleId}`
}

/** Common item names for the correction sheet, taken from the guide. */
export const suggestionItems = guide.rules.map((r) => r.item_names[0])

export const guideJsonString = JSON.stringify(guideJson)

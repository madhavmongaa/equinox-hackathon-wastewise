// Gemini identifies the item. The guide decides the bin when it has a rule for it;
// otherwise Gemini's own rule is used and labelled as AI-suggested.

import { AI_RULE_ID, getCategory, getRule } from "@/lib/guide"
import { identifyItem } from "@/lib/gemini"
import type { Box, DetectedItemAI, HistoryEntry, MultiPart, Outcome, Rule, ScanAI, ScanInput, SingleOutcome } from "@/lib/types"
import { uuid } from "@/lib/utils"

export const MAX_CLARIFY_ROUNDS = 2

export function interpret(ai: ScanAI, roundsAnswered: number): Outcome {
  if (!ai.needs_clarification && (ai.items?.length ?? 0) >= 2) {
    return { kind: "multi", ai, parts: ai.items!.map(toPart) }
  }
  return interpretSingle(ai, roundsAnswered)
}

function interpretSingle(ai: ScanAI, roundsAnswered: number): Outcome {
  if (ai.needs_clarification) {
    const question = ai.clarifying_question?.trim()
    if (question && roundsAnswered < MAX_CLARIFY_ROUNDS) {
      return { kind: "clarify", ai, question, options: ai.clarifying_options.filter(Boolean).slice(0, 4) }
    }
    return { kind: "not_found", ai, reason: "unclear" }
  }
  const rule = (ai.rule_found ? getRule(ai.rule_id) : null) ?? generatedRule(ai)
  const category = rule ? getCategory(rule.category_id) : null
  if (rule && category) return { kind: "result", ai, rule, category }
  return { kind: "not_found", ai, reason: "no_rule" }
}

/** One item of a multi-item scan, decided by the same guide-first rules. */
function toPart(it: DetectedItemAI): MultiPart {
  const ai: ScanAI = {
    item: it.item,
    material: it.material,
    confidence: it.confidence,
    needs_clarification: false,
    clarifying_question: null,
    clarifying_options: [],
    rule_found: it.rule_found,
    rule_id: it.rule_id,
    generated_rule: it.generated_rule,
    reasoning_note: "",
  }
  return { ai, outcome: interpretSingle(ai, 0) as SingleOutcome, box: toBox(it.box_2d) }
}

function toBox(b: number[] | null): Box | null {
  if (!Array.isArray(b) || b.length !== 4 || b.some((v) => typeof v !== "number")) return null
  const [ymin, xmin, ymax, xmax] = b.map((v) => Math.min(1, Math.max(0, v / 1000)))
  if (ymax - ymin < 0.01 || xmax - xmin < 0.01) return null
  return { top: ymin, left: xmin, bottom: ymax, right: xmax }
}

/** Turns the model's own rule into a Rule, if it gave a usable one. */
function generatedRule(ai: ScanAI): Rule | null {
  const g = ai.generated_rule
  if (!g || !getCategory(g.category_id) || !g.explanation?.trim()) return null
  return {
    rule_id: AI_RULE_ID,
    item_names: [ai.item],
    material: ai.material,
    category_id: g.category_id,
    preparation: (g.preparation ?? []).filter(Boolean).slice(0, 4),
    source_text: g.explanation.trim(),
  }
}

export async function runIdentification(input: ScanInput): Promise<Outcome> {
  const ai = await identifyItem(input)
  return interpret(ai, input.clarifications.length)
}

export function inputType(input: ScanInput): HistoryEntry["input_type"] {
  if (input.image && input.description.trim()) return "photo+text"
  return input.image ? "photo" : "text"
}

/** Builds the history record for a finished scan ("✅ Got it"). */
export function buildHistoryEntry(opts: {
  input: ScanInput
  outcome: SingleOutcome
  originalAi: ScanAI | null
  points: number
}): HistoryEntry {
  const { input, outcome, originalAi, points } = opts
  const ai = outcome.ai
  const rule = outcome.kind === "result" ? outcome.rule : null
  const category = outcome.kind === "result" ? outcome.category : null
  return {
    id: uuid(),
    timestamp: new Date().toISOString(),
    input_type: inputType(input),
    thumbnail: input.image?.thumbnail ?? null,
    description: input.description,
    clarifications: input.clarifications,
    ai_item: originalAi?.item ?? ai?.item ?? input.description ?? "Unknown item",
    ai_material: ai?.material ?? "",
    confidence: ai?.confidence ?? null,
    corrected_item: input.correctedItem ?? null,
    rule_id: rule?.rule_id ?? null,
    category_id: category?.id ?? null,
    rule_found: !!rule,
    rule_snapshot:
      rule && category
        ? {
            rule_id: rule.rule_id,
            source_text: rule.source_text,
            preparation: rule.preparation,
            category_label: category.label,
            bin: category.bin,
          }
        : null,
    points_awarded: points,
  }
}

/** The item key used for the "same item within 10 minutes" fair-play check. */
export function itemKey(outcome: SingleOutcome, input: ScanInput) {
  if (outcome.kind === "result" && outcome.rule.rule_id !== AI_RULE_ID) return `rule:${outcome.rule.rule_id}`
  const name = input.correctedItem ?? outcome.ai?.item ?? input.description
  return `item:${(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`
}

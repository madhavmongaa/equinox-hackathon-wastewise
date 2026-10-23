import type { ComponentProps } from "react"
import type { LuluMascot } from "@/components/ui/LuluMascot"

export type LuluMood = NonNullable<ComponentProps<typeof LuluMascot>["mood"]>

export type Confidence = "high" | "medium" | "low"

export interface Category {
  id: string
  label: string
  bin: string
  color: string
}

export interface Rule {
  rule_id: string
  item_names: string[]
  material: string
  category_id: string
  preparation: string[]
  source_text: string
}

export interface WasteGuide {
  guide_name: string
  version?: string
  categories: Category[]
  rules: Rule[]
}

export interface QA {
  question: string
  answer: string
}

/** What the model returns for the scanner flow (2.4). */
export interface ScanAI {
  item: string
  material: string
  confidence: Confidence
  needs_clarification: boolean
  clarifying_question: string | null
  clarifying_options: string[]
  rule_found: boolean
  rule_id: string | null
  /** The model's own rule, filled only when the guide has no matching rule. */
  generated_rule?: GeneratedRule | null
  reasoning_note: string
  /** One entry per item when the photo or description holds two or more items. */
  items?: DetectedItemAI[]
}

export interface DetectedItemAI {
  item: string
  material: string
  confidence: Confidence
  /** [ymin, xmin, ymax, xmax], normalised to 0–1000; null for text-only scans */
  box_2d: number[] | null
  rule_found: boolean
  rule_id: string | null
  generated_rule: GeneratedRule | null
}

/** Box as fractions (0–1) of the image size. */
export interface Box {
  top: number
  left: number
  bottom: number
  right: number
}

export type SingleOutcome = Extract<Outcome, { kind: "result" | "not_found" }>

export interface MultiPart {
  ai: ScanAI
  outcome: SingleOutcome
  box: Box | null
}

export interface GeneratedRule {
  category_id: string
  preparation: string[]
  explanation: string
}

export interface ImageInput {
  /** JPEG data URL, max 1024px on the long edge */
  dataUrl: string
  /** small JPEG data URL, max 200px */
  thumbnail: string
}

export interface ScanInput {
  image: ImageInput | null
  description: string
  clarifications: QA[]
  /** Set when the user corrected the identification (text-only re-run). */
  correctedItem?: string
}

/** The app's decision: a guide rule when one matches, else the model's AI-suggested rule. */
export type Outcome =
  | { kind: "clarify"; ai: ScanAI; question: string; options: string[] }
  | { kind: "result"; ai: ScanAI; rule: Rule; category: Category }
  | { kind: "not_found"; ai: ScanAI | null; reason: "no_rule" | "unclear" }
  | { kind: "multi"; ai: ScanAI; parts: MultiPart[] }

export interface RuleSnapshot {
  rule_id: string
  source_text: string
  preparation: string[]
  category_label: string
  bin: string
}

export interface HistoryEntry {
  id: string
  timestamp: string
  input_type: "photo" | "text" | "photo+text"
  thumbnail: string | null
  description: string
  clarifications: QA[]
  ai_item: string
  ai_material: string
  confidence: Confidence | null
  corrected_item: string | null
  rule_id: string | null
  category_id: string | null
  rule_found: boolean
  rule_snapshot: RuleSnapshot | null
  points_awarded: number
}

export interface Profile {
  displayName: string
  avatar: string
  points: number
  weeklyPoints: number
  weekId: string
  totalScans: number
  rulesFound: number
  corrections: number
  clarificationsAnswered: number
  streakDays: number
  longestStreak: number
  lastActiveDate: string
  scoredToday: number
  showOnLeaderboard: boolean
}

import { GoogleGenAI, Type, type Content, type Part, type Schema } from "@google/genai"
import { CATEGORIES, categoriesJsonString } from "@/lib/categories"
import { replyLanguageNote } from "@/lib/i18n"
import { dataUrlToInline } from "@/lib/image"
import type { GeneratedRule, ImageInput, QA, ScanAI, ScanInput } from "@/lib/types"

const apiKey =
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
  (typeof process !== "undefined" ? process.env.GEMINI_API_KEY || process.env.API_KEY : undefined)
const rawModel = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || ""
const model = (rawModel === "gemini-2.5-flash" || !rawModel) ? "gemini-3.8-flash" : rawModel

export const geminiConfigured = true

let client: GoogleGenAI | null = null
function getClient() {
  if (!apiKey) throw new AIError("not_configured")
  client ??= new GoogleGenAI({ apiKey })
  return client
}

export class AIError extends Error {
  constructor(public kind: "network" | "invalid_json" | "not_configured") {
    super(kind)
  }
}

// ---------- system instructions ----------

export const SCANNER_INSTRUCTION = `You are WasteWise, a waste-identification assistant. Your job has two steps:
1. Identify the item and its likely material from the photo and/or description.
2. Decide which bin it goes in, using the bin categories below.

Rules you must follow:
- If the photo is blurry, partly hidden, or the material can't be determined (e.g. paper cup vs plastic-lined cup, single-material film vs multilayer wrapper, clean vs greasy), set needs_clarification to true and ask ONE short, specific question with 2–4 answer options. Do not guess.
- For every identified item, write the disposal rule in generated_rule: pick the best category_id from the bin categories below using standard Indian waste-segregation practice (Solid Waste Management Rules 2016), give 1–4 short preparation steps, and a one- or two-sentence explanation of why it goes in that bin. Always set rule_found to false and rule_id to null. Never leave an identified item without a rule.
- If the image doesn't show a waste item at all, say so in the item field and set needs_clarification to true.
- Only physical things someone is throwing away are items. Questions, requests, greetings or any other text in the USER DESCRIPTION that isn't describing waste are NEVER items and never get a bin: copy that part of the user's own words into side_question, and don't answer it here (Lulu, the chat assistant, answers questions). side_question may only quote the user description; never put the app's own notes (like "The photo above shows the item.") there, and with no user description it must be null. When a text-only input has nothing to throw away at all (only a question or chit-chat), set item to an empty string, material to an empty string, needs_clarification to false, rule_found to false, generated_rule to null and items to an empty array. A photo is always treated as a scan: if it shows no waste item, follow the rule above about photos without a waste item. Set side_question to null when there's no such text.
- clarifying_options are possible answers about the item (e.g. "Plastic", "Paper", "Clean", "Greasy"), never actions like "Upload photo", "Take a photo" or "Describe item" — the app already offers those.
- A container with something in it (a glass of cola, a half-full water bottle, a tiffin with leftovers) is ONE item: name it as the container with its contents (e.g. "glass with leftover cola"), classify the container, and make emptying the contents the first preparation step (liquids down the sink, food into the wet bin). Only list the contents as a separate item when they are separate solid waste.
- If the photo or description contains TWO OR MORE distinct waste items, list every item in items, one entry each, and write a generated_rule for each item separately. For a photo, give box_2d as [ymin, xmin, ymax, xmax] normalised to 0-1000. Make each box tight around its own item only. For text-only input, set box_2d to null. With two or more items, set the top-level item to a short summary such as "3 items", fill the other top-level fields for the most prominent item, and only set needs_clarification when the whole photo is unusable. When there is just one item, return an empty items array.
- Respond ONLY with JSON matching the response schema.

--- BIN CATEGORIES ---
${categoriesJsonString}`

const LULU_INSTRUCTION = `You are Lulu, the friendly WasteWise assistant. You are a paper coffee cup with robot eyes. Your speciality is waste sorting, but you can help with any question. Be warm and clear, and reply in the user's language style (English or Hinglish). Keep waste and app replies short (1–3 sentences).

Decide the user's intent: identify_item, answer_clarification, correct_item, show_history, show_stats, show_rank, show_leaderboard, explain_method, category_question, general_question, or off_topic.

For identify_item, answer_clarification and correct_item, follow the WasteWise scanner rules exactly: ask ONE clarifying question when uncertain, otherwise fill generated_rule (a bin category_id, 1–4 preparation steps and a short explanation), with rule_found false and rule_id null. Never invent numbers, ranks or statistics — the app fills in all numbers.

For category_question, set category_id to the bin the user asks about (e.g. "dry" for the blue bin) and, in lulu_message, say in one or two sentences what goes in it with a few everyday examples.

Do not quote bin names for an identified item, points, ranks, streaks or counts in lulu_message: the app shows those itself in a card below your message.

For anything else (general knowledge, science, studies, coding, writing, college and city life, sustainability, health, everyday advice, maths, small talk), use general_question and answer the question yourself in lulu_message: helpful, accurate and to the point, usually under 150 words, in plain text (for lists, put each "- " bullet on its own line, separated with \n; no markdown headings or bold). If the user only describes or names a single item without asking something else, treat it as identify_item, not general_question. You have no internet access. For facts that change only now and then (who holds an office, capitals, records, how things work), answer from what you know and add a short "as far as I know" when it could have changed since. Only for truly live information (today's news, prices, weather, scores) say you can't check that right now, then offer what you do know. If you are not sure, say so instead of guessing; never make up facts, figures, quotes or sources. For medical, legal or financial questions give general information and suggest a qualified person for their situation. Decline anything harmful or unsafe kindly.

Use off_topic only when the message is empty, unreadable or not a question or request at all.

This is one chat session. The conversation so far is given with each message: remember everything the user said or was shown in it (their name, preferences, earlier items, questions and your answers) and use it for follow-ups like "that one", "what about the second?" or "what did I ask first?". You don't remember earlier chats; if asked about one, say each new chat starts fresh.

Respond ONLY with JSON matching the schema.`

// ---------- schemas ----------

const generatedRuleSchema: Schema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    category_id: { type: Type.STRING, enum: CATEGORIES.map((c) => c.id) },
    preparation: { type: Type.ARRAY, items: { type: Type.STRING } },
    explanation: { type: Type.STRING },
  },
  required: ["category_id", "preparation", "explanation"],
}

const detectedItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    item: { type: Type.STRING },
    material: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    box_2d: { type: Type.ARRAY, items: { type: Type.INTEGER }, nullable: true },
    rule_found: { type: Type.BOOLEAN },
    rule_id: { type: Type.STRING, nullable: true },
    generated_rule: generatedRuleSchema,
  },
  required: ["item", "material", "confidence", "box_2d", "rule_found", "rule_id", "generated_rule"],
}

const scanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    item: { type: Type.STRING },
    material: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    needs_clarification: { type: Type.BOOLEAN },
    clarifying_question: { type: Type.STRING, nullable: true },
    clarifying_options: { type: Type.ARRAY, items: { type: Type.STRING } },
    rule_found: { type: Type.BOOLEAN },
    rule_id: { type: Type.STRING, nullable: true },
    generated_rule: generatedRuleSchema,
    reasoning_note: { type: Type.STRING },
    items: { type: Type.ARRAY, items: detectedItemSchema },
    side_question: { type: Type.STRING, nullable: true },
  },
  required: [
    "item",
    "material",
    "confidence",
    "needs_clarification",
    "clarifying_question",
    "clarifying_options",
    "rule_found",
    "rule_id",
    "generated_rule",
    "reasoning_note",
    "items",
    "side_question",
  ],
  propertyOrdering: [
    "item",
    "material",
    "confidence",
    "needs_clarification",
    "clarifying_question",
    "clarifying_options",
    "rule_found",
    "rule_id",
    "generated_rule",
    "reasoning_note",
    "items",
    "side_question",
  ],
}

export const LULU_INTENTS = [
  "identify_item",
  "answer_clarification",
  "correct_item",
  "show_history",
  "show_stats",
  "show_rank",
  "show_leaderboard",
  "explain_method",
  "category_question",
  "general_question",
  "off_topic",
] as const
export type LuluIntent = (typeof LULU_INTENTS)[number]

export interface LuluAI {
  intent: LuluIntent
  lulu_message: string
  lulu_mood: "happy" | "confused" | "sorry" | "idle"
  item: string | null
  material: string | null
  confidence: "high" | "medium" | "low" | null
  needs_clarification: boolean
  clarifying_question: string | null
  clarifying_options: string[]
  rule_found: boolean
  rule_id: string | null
  generated_rule: GeneratedRule | null
  category_id: string | null
}

const luluSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: { type: Type.STRING, enum: [...LULU_INTENTS] },
    lulu_message: { type: Type.STRING },
    lulu_mood: { type: Type.STRING, enum: ["happy", "confused", "sorry", "idle"] },
    item: { type: Type.STRING, nullable: true },
    material: { type: Type.STRING, nullable: true },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"], nullable: true },
    needs_clarification: { type: Type.BOOLEAN },
    clarifying_question: { type: Type.STRING, nullable: true },
    clarifying_options: { type: Type.ARRAY, items: { type: Type.STRING } },
    rule_found: { type: Type.BOOLEAN },
    rule_id: { type: Type.STRING, nullable: true },
    generated_rule: generatedRuleSchema,
    category_id: { type: Type.STRING, nullable: true },
  },
  required: [
    "intent",
    "lulu_message",
    "lulu_mood",
    "item",
    "material",
    "confidence",
    "needs_clarification",
    "clarifying_question",
    "clarifying_options",
    "rule_found",
    "rule_id",
    "generated_rule",
    "category_id",
  ],
}

// ---------- prompt building ----------

function imagePart(image: ImageInput): Part {
  return { inlineData: dataUrlToInline(image.dataUrl) }
}

function describeInput(input: ScanInput) {
  const lines: string[] = []
  if (input.correctedItem) {
    lines.push(
      `The user corrected the identification. The item is actually: "${input.correctedItem}". Treat this as the item name (text only) and decide its bin.`
    )
  } else {
    lines.push(input.image ? "The photo above shows the item." : "There is no photo; identify the item from the description.")
    if (input.description.trim()) lines.push(`User description: "${input.description.trim()}"`)
  }
  if (input.clarifications.length) {
    lines.push("Clarifications already answered by the user:")
    input.clarifications.forEach((c: QA) => lines.push(`- Q: ${c.question}\n  A: ${c.answer}`))
    lines.push("Use these answers. Only ask another question if the material is still genuinely unclear.")
  }
  return lines.join("\n")
}

async function callJson<T>(contents: Content[], systemInstruction: string, schema: Schema, validate: (v: unknown) => v is T): Promise<T> {
  const ai = getClient()
  const candidateModels = [model, "gemini-3.1-flash-lite"].filter((m, i, arr) => m && arr.indexOf(m) === i)
  for (const m of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let text: string | undefined
      try {
        const res = await ai.models.generateContent({
          model: m,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.2,
          },
        })
        text = res.text
      } catch (err: any) {
        console.warn(`Gemini client call with ${m} failed:`, err?.message || err)
        if (err?.status === 503 || err?.status === 404 || err?.message?.includes("503") || err?.message?.includes("404")) {
          break
        }
        continue
      }
      try {
        const parsed = JSON.parse(text ?? "")
        if (validate(parsed)) return parsed
      } catch {
        // fall through to retry
      }
    }
  }
  throw new AIError("network")
}

function isScanAI(v: unknown): v is ScanAI {
  const o = v as ScanAI
  return !!o && typeof o.item === "string" && typeof o.needs_clarification === "boolean" && typeof o.rule_found === "boolean"
}

function isLuluAI(v: unknown): v is LuluAI {
  const o = v as LuluAI
  return !!o && typeof o.lulu_message === "string" && (LULU_INTENTS as readonly string[]).includes(o.intent)
}

// ---------- public calls ----------

/** Scanner flow (2.3–2.5). Queries server API first, falls back to client SDK. */
export async function identifyItem(input: ScanInput): Promise<ScanAI> {
  // 1. Try server-side endpoint first
  try {
    const res = await fetch("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (res.ok) {
      const data = await res.json()
      if (isScanAI(data)) {
        return { ...data, clarifying_options: Array.isArray(data.clarifying_options) ? data.clarifying_options.slice(0, 4) : [] }
      }
    }
  } catch (err) {
    console.warn("Backend /api/identify unavailable, falling back to client SDK:", err)
  }

  // 2. Direct client SDK fallback
  const parts: Part[] = []
  if (input.image && !input.correctedItem) parts.push(imagePart(input.image))
  parts.push({ text: describeInput(input) })
  const ai = await callJson([{ role: "user", parts }], SCANNER_INSTRUCTION, scanSchema, isScanAI)
  return { ...ai, clarifying_options: Array.isArray(ai.clarifying_options) ? ai.clarifying_options.slice(0, 4) : [] }
}

export interface LuluTurn {
  text: string
  image: ImageInput | null
  /** An identification waiting on a clarifying answer, if any. */
  pending: (ScanInput & { question: string }) | null
  /** The last identified item, so "that's wrong, it's X" can be understood. */
  lastItem: string | null
  /** This chat so far, oldest first (Lulu remembers it until the chat is closed). */
  recent: { role: "user" | "lulu"; text: string }[]
  /** Reply language ("hi" = Hindi); English when missing. */
  lang?: "en" | "hi"
}

/** Same bounds as the server: the most recent messages within ~12k characters (max 60). */
function chatHistory(recent: LuluTurn["recent"]): string[] {
  const lines: string[] = []
  let budget = 12000
  for (const m of recent.slice(-60).reverse()) {
    if (!m.text.trim()) continue
    const line = `${m.role === "user" ? "User" : "Lulu"}: ${m.text.trim().slice(0, 1500)}`
    if (line.length > budget) break
    budget -= line.length
    lines.unshift(line)
  }
  return lines
}

/** Lulu: queries server API first, falls back to client SDK. */
export async function askLulu(turn: LuluTurn): Promise<LuluAI> {
  // 1. Try server-side endpoint first
  try {
    const res = await fetch("/api/ask-lulu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(turn),
    })
    if (res.ok) {
      const data = await res.json()
      if (isLuluAI(data)) {
        return data
      }
    }
  } catch (err) {
    console.warn("Backend /api/ask-lulu unavailable, falling back to client SDK:", err)
  }

  // 2. Direct client SDK fallback
  const parts: Part[] = []
  const image = turn.image ?? turn.pending?.image ?? null
  if (image) parts.push(imagePart(image))

  const ctx: string[] = []
  const history = chatHistory(turn.recent)
  if (history.length) {
    ctx.push("Conversation so far in this chat (oldest first):", ...history)
  }
  if (turn.pending) {
    ctx.push(
      `\nAn identification is waiting for the user's answer. Original description: "${turn.pending.description || "(none)"}". ` +
        `You asked: "${turn.pending.question}". If the user's message answers it, use intent answer_clarification and identify the item using the photo (if any), the description and the answer.`
    )
    if (turn.pending.clarifications.length) {
      ctx.push("Earlier answers: " + turn.pending.clarifications.map((c) => `${c.question} → ${c.answer}`).join("; "))
    }
  }
  if (turn.lastItem) ctx.push(`The last item identified in this chat was: "${turn.lastItem}".`)
  if (turn.image) ctx.push("The user just sent the photo above.")
  const langNote = replyLanguageNote(turn.lang ?? "en")
  if (langNote) ctx.push(langNote)
  ctx.push(`\nUser message: "${turn.text || (turn.image ? "(photo only)" : "")}"`)
  parts.push({ text: ctx.join("\n") })

  return callJson(
    [{ role: "user", parts }],
    `${LULU_INSTRUCTION}\n\n--- WasteWise scanner rules ---\n${SCANNER_INSTRUCTION}`,
    luluSchema,
    isLuluAI
  )
}

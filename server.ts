import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GoogleGenAI, Type, type Schema } from "@google/genai"
import guide from "./src/data/wasteGuide.json" with { type: "json" }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(express.json({ limit: "15mb" }))

// Setup Gemini SDK on server with telemetry header
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null

const guideJsonString = JSON.stringify(guide)

const SCANNER_INSTRUCTION = `You are WasteWise, a waste-identification assistant for the Zenith campus. Your job has two steps:
1. Identify the item and its likely material from the photo and/or description.
2. Match it to a rule in the supplied CAMPUS WASTE GUIDE (JSON below).

Rules you must follow:
- If a rule in the supplied guide matches the item, use it: set rule_found to true and rule_id to that rule, and set generated_rule to null.
- If the photo is blurry, partly hidden, or the material can't be determined (e.g. paper cup vs plastic-lined cup, single-material film vs multilayer wrapper, clean vs greasy), set needs_clarification to true and ask ONE short, specific question with 2–4 answer options. Do not guess.
- If you can identify the item but no rule in the guide matches it, set rule_found to false, leave rule_id null, and write your own rule in generated_rule: pick the best category_id from the guide's categories using standard Indian campus waste-segregation practice, give 1–4 short preparation steps, and a one- or two-sentence explanation of why it goes in that bin. Never leave an identified item without a rule.
- If the image doesn't show a waste item at all, say so in the item field and set needs_clarification to true.
- Respond ONLY with JSON matching the response schema.

--- CAMPUS WASTE GUIDE ---
${guideJsonString}`

const LULU_INSTRUCTION = `You are Lulu, the friendly AI waste-sorting guide for the Zenith campus. You are a paper coffee cup with robot eyes. Keep replies short (1–3 sentences), warm and clear. Reply in the user's language style (English or Hinglish).

Decide the user's intent: identify_item, answer_clarification, correct_item, show_history, show_stats, show_rank, show_leaderboard, explain_method, start_quiz, category_question, or off_topic.

For identify_item, answer_clarification and correct_item, follow the WasteWise rules exactly: use the matching rule from the supplied campus waste guide when there is one; ask ONE clarifying question when uncertain. When the guide has no matching rule, set rule_found to false and fill generated_rule with your own rule (a guide category_id, 1–4 preparation steps and a short explanation). Never invent numbers, ranks or statistics — the app fills in all numbers.

For category_question, set category_id to the guide category the user asks about (e.g. "dry" for the blue bin) and do not list the rules yourself — the app lists them from the guide.

Do not quote rule text, bin names for an item, points, ranks, streaks or counts in lulu_message: the app shows those itself in a card below your message.

Respond ONLY with JSON matching the schema.`

const generatedRuleSchema: Schema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    category_id: { type: Type.STRING, enum: guide.categories.map((c) => c.id) },
    preparation: { type: Type.ARRAY, items: { type: Type.STRING } },
    explanation: { type: Type.STRING },
  },
  required: ["category_id", "preparation", "explanation"],
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
  ],
}

const LULU_INTENTS = [
  "identify_item",
  "answer_clarification",
  "correct_item",
  "show_history",
  "show_stats",
  "show_rank",
  "show_leaderboard",
  "explain_method",
  "start_quiz",
  "category_question",
  "off_topic",
] as const

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

async function generateWithFallback(contents: any[], systemInstruction: string, schema: Schema) {
  if (!ai) {
    throw new Error("Gemini API key is not configured on the server")
  }

  // Prioritize gemini-3.1-flash-lite for near-instant responses; fall back to gemini-3.8-flash
  const models = ["gemini-3.1-flash-lite", "gemini-3.8-flash"]
  let lastError: any = null

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.2,
          },
        })
        const text = res.text
        if (text) {
          return JSON.parse(text)
        }
      } catch (err: any) {
        lastError = err
        console.warn(`[Gemini Server] ${model} attempt ${attempt + 1} failed:`, err?.message || err)
        if (err?.status === 503 || err?.status === 404 || err?.message?.includes("503") || err?.message?.includes("404")) {
          break // switch model
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with Gemini")
}

// ---------- API Routes ----------

app.post("/api/identify", async (req, res) => {
  try {
    const input = req.body
    const parts: any[] = []

    if (input.image && !input.correctedItem) {
      const match = input.image.dataUrl?.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        })
      }
    }

    const lines: string[] = []
    if (input.correctedItem) {
      lines.push(
        `The user corrected the identification. The item is actually: "${input.correctedItem}". Treat this as the item name (text only) and match it to the guide.`
      )
    } else {
      lines.push(input.image ? "The photo above shows the item." : "There is no photo; identify the item from the description.")
      if (input.description && input.description.trim()) {
        lines.push(`User description: "${input.description.trim()}"`)
      }
    }

    if (input.clarifications && input.clarifications.length) {
      lines.push("Clarifications already answered by the user:")
      input.clarifications.forEach((c: any) => lines.push(`- Q: ${c.question}\n  A: ${c.answer}`))
      lines.push("Use these answers. Only ask another question if the material is still genuinely unclear.")
    }

    parts.push({ text: lines.join("\n") })

    const result = await generateWithFallback(
      [{ role: "user", parts }],
      SCANNER_INSTRUCTION,
      scanSchema
    )

    res.json(result)
  } catch (err: any) {
    console.error("Server /api/identify error:", err)
    res.status(500).json({ error: err?.message || "Identification failed" })
  }
})

app.post("/api/ask-lulu", async (req, res) => {
  try {
    const turn = req.body
    const parts: any[] = []
    const image = turn.image ?? turn.pending?.image ?? null

    if (image?.dataUrl) {
      const match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        })
      }
    }

    const ctx: string[] = []
    if (turn.recent && turn.recent.length) {
      ctx.push("Recent conversation:")
      turn.recent.slice(-6).forEach((m: any) => ctx.push(`${m.role === "user" ? "User" : "Lulu"}: ${m.text}`))
    }

    if (turn.pending) {
      ctx.push(
        `\nAn identification is waiting for the user's answer. Original description: "${turn.pending.description || "(none)"}". ` +
          `You asked: "${turn.pending.question}". If the user's message answers it, use intent answer_clarification and identify the item using the photo (if any), the description and the answer.`
      )
      if (turn.pending.clarifications && turn.pending.clarifications.length) {
        ctx.push("Earlier answers: " + turn.pending.clarifications.map((c: any) => `${c.question} → ${c.answer}`).join("; "))
      }
    }

    if (turn.lastItem) ctx.push(`The last item identified in this chat was: "${turn.lastItem}".`)
    if (turn.image) ctx.push("The user just sent the photo above.")
    ctx.push(`\nUser message: "${turn.text || (turn.image ? "(photo only)" : "")}"`)
    parts.push({ text: ctx.join("\n") })

    const result = await generateWithFallback(
      [{ role: "user", parts }],
      `${LULU_INSTRUCTION}\n\n--- WasteWise scanner rules ---\n${SCANNER_INSTRUCTION}`,
      luluSchema
    )

    res.json(result)
  } catch (err: any) {
    console.error("Server /api/ask-lulu error:", err)
    res.status(500).json({ error: err?.message || "Lulu query failed" })
  }
})

// ---------- Vite / Static Middleware ----------

async function startServer() {
  const isDev = process.env.NODE_ENV !== "production"

  if (isDev) {
    const { createServer: createViteServer } = await import("vite")
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "mpa",
    })
    app.use(vite.middlewares)
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")))
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist/index.html"))
    })
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WasteWise server listening on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((err) => {
  console.error("Failed to start server:", err)
})

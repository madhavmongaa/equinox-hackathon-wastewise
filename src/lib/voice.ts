// Voice input and output with the browser's Web Speech API: no keys, no extra cost.
// Input needs SpeechRecognition (Chrome, Edge, Safari); output needs speechSynthesis (all modern browsers).

import { useSyncExternalStore } from "react"
import type { Outcome } from "@/lib/types"
import { AI_RULE_ID } from "@/lib/guide"

const LANG = "en-IN"

// ---------- input ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recognition = any

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export const canListen = () => !!recognitionClass()

export type ListenError = "denied" | "no-speech" | "network" | "other"

export interface ListenHandlers {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onError: (kind: ListenError) => void
  onEnd: () => void
}

/** Listens for one phrase. Returns a function that stops listening early. */
export function listen(h: ListenHandlers): () => void {
  const Rec = recognitionClass()
  if (!Rec) {
    h.onError("other")
    h.onEnd()
    return () => {}
  }
  stopSpeaking() // don't let Lulu's voice feed back into the mic
  const rec: Recognition = new Rec()
  rec.lang = LANG
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  let finalText = ""
  rec.onresult = (e: Recognition) => {
    let interim = ""
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    h.onInterim((finalText + interim).trim())
  }
  rec.onerror = (e: Recognition) => {
    const kind: ListenError =
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "denied"
        : e.error === "no-speech"
          ? "no-speech"
          : e.error === "network"
            ? "network"
            : "other"
    if (e.error !== "aborted") h.onError(kind)
  }
  rec.onend = () => {
    const t = finalText.trim()
    if (t) {
      lastVoiceAt = Date.now()
      h.onFinal(t)
    }
    h.onEnd()
  }
  try {
    rec.start()
  } catch {
    h.onError("other")
    h.onEnd()
  }
  return () => {
    try {
      rec.stop()
    } catch {
      /* already stopped */
    }
  }
}

let lastVoiceAt = 0

/** True (once) if the user spoke their last request in the past minute, so the answer should be read aloud. */
export function consumeVoiceTurn() {
  const recent = Date.now() - lastVoiceAt < 60_000
  lastVoiceAt = 0
  return recent
}

// ---------- output ----------

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window

let speakingKey: string | null = null
const listeners = new Set<() => void>()
function setSpeaking(key: string | null) {
  speakingKey = key
  listeners.forEach((l) => l())
}

/** Which text is being read aloud right now (by key), or null. */
export function useSpeakingKey() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => speakingKey,
    () => null
  )
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang === LANG ? 40 : v.lang.startsWith("en-GB") ? 20 : v.lang.startsWith("en") ? 10 : 0) +
    (/google|natural|neural|premium|enhanced|samantha|veena|rishi/i.test(v.name) ? 5 : 0) +
    (v.localService ? 1 : 0)
  return [...voices].sort((a, b) => score(b) - score(a))[0]
}

if (canSpeak()) {
  // voices load asynchronously in Chrome; ask once so they're ready when needed
  window.speechSynthesis.getVoices()
}

/** Strips emoji and symbols the voice would otherwise read out ("waving hand"). */
function forSpeech(text: string) {
  return text
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/§/g, "section ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Reads `text` aloud, replacing anything already playing. `key` identifies it for play/stop buttons. */
export function speak(text: string, key = "default") {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const clean = forSpeech(text)
  if (!clean) return setSpeaking(null)
  // Chrome stops long utterances after ~15 s, so speak sentence by sentence
  const parts = clean.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean]
  const voice = pickVoice()
  setSpeaking(key)
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part)
    u.lang = voice?.lang ?? LANG
    if (voice) u.voice = voice
    u.rate = 1.02
    if (i === parts.length - 1) {
      u.onend = () => speakingKey === key && setSpeaking(null)
    }
    u.onerror = () => speakingKey === key && setSpeaking(null)
    synth.speak(u)
  })
}

export function stopSpeaking() {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  setSpeaking(null)
}

// ---------- what to say for a result ----------

export function resultSpeech(item: string, category: { label: string; bin: string }, steps: string[], ruleId: string) {
  const prep = steps.length ? ` ${steps.join(". ")}.` : ""
  const source = ruleId === AI_RULE_ID ? " This one is AI-suggested, not from the campus guide." : ""
  return `${item}. ${category.label}, ${category.bin}.${prep}${source}`
}

/** The spoken version of a scan answer: item, bin, steps, and where the rule came from. */
export function outcomeSpeech(outcome: Outcome): string {
  switch (outcome.kind) {
    case "result":
      return resultSpeech(outcome.ai.item, outcome.category, outcome.rule.preparation, outcome.rule.rule_id)
    case "not_found":
      return outcome.reason === "unclear"
        ? "I couldn't tell for sure what this is. Try a clearer photo."
        : `I couldn't find a disposal rule for ${outcome.ai?.item ?? "this item"}. Ask the campus housekeeping team.`
    case "clarify": {
      const opts = outcome.options
      const list = opts.length > 1 ? ` ${opts.slice(0, -1).join(", ")}, or ${opts[opts.length - 1]}?` : ""
      return `${outcome.question}${list}`
    }
    case "multi": {
      const groups = new Map<string, { label: string; bin: string; items: string[] }>()
      for (const p of outcome.parts) {
        const cat = p.outcome.kind === "result" ? p.outcome.category : null
        const key = cat?.id ?? "unsorted"
        if (!groups.has(key)) groups.set(key, { label: cat?.label ?? "Not sorted", bin: cat?.bin ?? "ask housekeeping", items: [] })
        groups.get(key)!.items.push(p.ai.item)
      }
      const bins = [...groups.keys()].filter((k) => k !== "unsorted").length
      const lines = [...groups.values()].map((g) => `${g.label}, ${g.bin}: ${g.items.join(", ")}.`)
      return `${outcome.parts.length} items in ${bins} ${bins === 1 ? "bin" : "bins"}. ${lines.join(" ")}`
    }
  }
}

// English / हिन्दी. The main labels (navigation, Home, scan results) are translated here
// and Lulu replies in Hindi.

import { useSyncExternalStore } from "react"

export type Lang = "en" | "hi"

const KEY = "wastewise.lang.v1"
const listeners = new Set<() => void>()
let lang: Lang = (() => {
  try {
    return localStorage.getItem(KEY) === "hi" ? "hi" : "en"
  } catch {
    return "en"
  }
})()
if (typeof document !== "undefined") document.documentElement.lang = lang

export function getLang() {
  return lang
}

export function setLang(next: Lang) {
  lang = next
  document.documentElement.lang = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l())
}

export function useLang(): Lang {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, getLang)
}

const HI: Record<string, string> = {
  Home: "होम",
  Scan: "स्कैन",
  Dumps: "कचरा ढेर",
  Leaderboard: "लीडरबोर्ड",
  History: "इतिहास",
  Profile: "प्रोफ़ाइल",
  "Chat with Lulu": "लुलु से बात करें",
  Lulu: "लुलु",
  "Sign in": "साइन इन",
  "Let's sort it": "चलो सही",
  "right 🌱": "छाँटें 🌱",
  "Not sure which bin to use? Lulu will tell you.": "कौन-सा डिब्बा? लुलु बताएगी।",
  "Ask Lulu!": "लुलु से पूछो!",
  "Your impact": "आपका असर",
  "CO₂ saved": "CO₂ की बचत",
  "Bin map": "डिब्बों का नक्शा",
  "Nearest bin": "सबसे पास का डिब्बा",
  "Every bin": "हर डिब्बा",
  Kabadiwala: "कबाड़ीवाला",
  "Sell your scrap": "कबाड़ बेचें",
  Cleaning: "सफ़ाई",
  "Services nearby": "पास की सेवाएँ",
  "Weekly challenges": "साप्ताहिक चुनौतियाँ",
  "Your progress": "आपकी प्रगति",
  "Recent scans": "हाल के स्कैन",
  "See all": "सब देखें",
  "Next pickups": "अगला कलेक्शन",
  "This week's top sorters": "इस हफ़्ते के टॉप छँटाई करने वाले",
  "Scan Object": "स्कैन करें",
  "How to prepare it": "कैसे तैयार करें",
  "Why this answer": "यह जवाब क्यों",
  "Scan Again": "फिर स्कैन करें",
  Done: "हो गया",
  "Ask Lulu": "लुलु से पूछें",
  "Identify your waste": "अपना कचरा पहचानें",
  Language: "भाषा",
  "Snap it, upload it, or tell Lulu what it is": "फ़ोटो लें, अपलोड करें या लुलु को बताएँ",
  " (type or speak)": " (लिखकर या बोलकर)",
  "Scan Item": "स्कैन करें",
  "Open camera": "कैमरा खोलें",
  "Upload Photo": "फ़ोटो अपलोड करें",
  "OR DESCRIBE IT": "या बताइए",
  "Listening… say the item": "सुन रहे हैं… चीज़ का नाम बोलें",
  "e.g. a greasy pizza box…": "जैसे: तेल वाला पिज़्ज़ा डिब्बा…",
}

/** The label in the current language (English when there's no translation). */
export function t(text: string, l: Lang = lang) {
  return l === "hi" ? (HI[text] ?? text) : text
}

/** Instruction added to Lulu's request so replies come in the chosen language. */
export function replyLanguageNote(l: Lang) {
  return l === "hi"
    ? "The user chose Hindi in the app: ALWAYS write lulu_message in simple, friendly Hindi in Devanagari script (हिन्दी), even when the user writes in English or Hinglish. This overrides the language-style rule above. You may add an English word in brackets for bin or item names."
    : ""
}

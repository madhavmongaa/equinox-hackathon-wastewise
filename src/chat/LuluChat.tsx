// Lulu chat (Part 3). One Gemini call per user turn; the app decides what is shown.

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, ChevronRight, Paperclip, Send, X } from "lucide-react"
import { Mark } from "@/components/ui/card"
import { Sheet } from "@/components/ui/sheet"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { CategoryChip } from "@/components/brand"
import { ANALYSIS_STEPS, ClarificationCard, CorrectionSheet, ErrorCard, OutcomeView, ResultActions, useAnalysisStep } from "@/components/scan-views"
import { BoardList, HistoryRow, LevelProgress, NotConnectedNote, StatTile } from "@/components/widgets"
import { useLeaderboard, useMyRank } from "@/hooks/useLeaderboard"
import { useStats } from "@/hooks/useStats"
import { interpret } from "@/lib/flow"
import { askLulu, type LuluAI, type LuluTurn } from "@/lib/gemini"
import { getCategory, guide, ruleLabel, rulesForCategory } from "@/lib/guide"
import { levelFor } from "@/lib/levels"
import type { ImageInput, LuluMood, Outcome, ScanAI, ScanInput } from "@/lib/types"
import { cn, uuid } from "@/lib/utils"
import { errorMessage } from "@/screens/ScanScreen"
import { useApp } from "@/state/AppContext"
import { useCapture } from "@/state/capture"

const WELCOME =
  "Hi! I'm Lulu 👋 Show me any item and I'll tell you which bin it goes in — using our campus waste guide. Scan it, upload a photo, or just describe it."
const EXPLAIN =
  "I identify the item, then look it up in the Zenith campus waste guide. If the guide has a rule for it, I show you that exact rule. If it doesn't, I suggest a bin myself and mark it as AI-suggested. If I'm not sure what the item is, I ask you first."
const OFF_TOPIC = "I'm best at waste sorting! Want to scan something?"
const QUIZ = "The Eco Quiz is coming soon 🧠 For now, show me something to sort!"

type Card =
  | { type: "outcome"; outcome: Extract<Outcome, { kind: "result" | "not_found" }>; input: ScanInput; originalAi: ScanAI | null; saved: boolean }
  | { type: "clarify"; outcome: Extract<Outcome, { kind: "clarify" }>; input: ScanInput; answered: boolean }
  | { type: "history" }
  | { type: "stats" }
  | { type: "rank" }
  | { type: "leaderboard" }
  | { type: "category"; categoryId: string }
  | { type: "error"; message: string; retry: PendingTurn }

interface Msg {
  id: string
  role: "user" | "lulu"
  text?: string
  image?: string
  card?: Card
}

interface PendingTurn {
  text: string
  image: ImageInput | null
}

interface Pending extends ScanInput {
  question: string
  originalAi: ScanAI | null
}

function toScanAI(ai: LuluAI, fallbackItem: string): ScanAI {
  return {
    item: ai.item || fallbackItem || "this item",
    material: ai.material ?? "",
    confidence: ai.confidence ?? "low",
    needs_clarification: ai.needs_clarification,
    clarifying_question: ai.clarifying_question,
    clarifying_options: Array.isArray(ai.clarifying_options) ? ai.clarifying_options.slice(0, 4) : [],
    rule_found: ai.rule_found,
    rule_id: ai.rule_id,
    generated_rule: ai.generated_rule,
    reasoning_note: "",
  }
}

export function LuluChat() {
  const { chatOpen, setChatOpen, finishScan } = useApp()
  const capture = useCapture()
  const [messages, setMessages] = useState<Msg[]>([{ id: "welcome", role: "lulu", text: WELCOME }])
  const [mood, setMood] = useState<LuluMood>("idle")
  const [typing, setTyping] = useState<null | "identify" | "chat">(null)
  const [text, setText] = useState("")
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const pending = useRef<Pending | null>(null)
  const last = useRef<{ input: ScanInput; originalAi: ScanAI | null; item: string } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [messages, typing])

  const push = useCallback((m: Omit<Msg, "id">) => setMessages((list) => [...list, { ...m, id: uuid() }]), [])
  const patchCard = useCallback((id: string, fn: (c: Card) => Card) => {
    setMessages((list) => list.map((m) => (m.id === id && m.card ? { ...m, card: fn(m.card) } : m)))
  }, [])

  /** Lulu "talks" while her reply appears, then settles into the reply's mood. */
  const say = useCallback(
    (text: string, settle: LuluMood, card?: Card) => {
      push({ role: "lulu", text, card })
      setMood("talking")
      if (moodTimer.current) clearTimeout(moodTimer.current)
      moodTimer.current = setTimeout(() => setMood(settle), 1300)
    },
    [push]
  )

  const handleAI = useCallback(
    (ai: LuluAI, turn: PendingTurn) => {
      const intent = ai.intent
      if (intent === "identify_item" || intent === "answer_clarification" || intent === "correct_item") {
        let input: ScanInput
        let originalAi: ScanAI | null = null
        const p = pending.current
        if (intent === "answer_clarification" && p) {
          input = { image: p.image, description: p.description, clarifications: [...p.clarifications, { question: p.question, answer: turn.text }] }
          originalAi = p.originalAi
        } else if (intent === "correct_item") {
          const base = last.current?.input ?? { image: null, description: "", clarifications: [] }
          input = { ...base, clarifications: [], correctedItem: ai.item || turn.text }
          originalAi = last.current?.originalAi ?? null
        } else {
          input = { image: turn.image, description: turn.text, clarifications: [] }
        }
        const scanAI = toScanAI(ai, input.correctedItem ?? turn.text)
        if (!input.correctedItem) originalAi = scanAI
        const outcome = interpret(scanAI, input.clarifications.length)

        if (outcome.kind === "clarify") {
          pending.current = { ...input, question: outcome.question, originalAi }
          say(ai.lulu_message, "confused", { type: "clarify", outcome, input, answered: false })
          return
        }
        pending.current = null
        last.current = { input, originalAi, item: input.correctedItem ?? scanAI.item }
        say(ai.lulu_message, outcome.kind === "result" ? "happy" : "sorry", { type: "outcome", outcome, input, originalAi, saved: false })
        return
      }

      const settle: LuluMood = ai.lulu_mood === "confused" ? "idle" : ai.lulu_mood
      switch (intent) {
        case "show_history":
          return say(ai.lulu_message, settle, { type: "history" })
        case "show_stats":
          return say(ai.lulu_message, settle, { type: "stats" })
        case "show_rank":
          return say(ai.lulu_message, settle, { type: "rank" })
        case "show_leaderboard":
          return say(ai.lulu_message, settle, { type: "leaderboard" })
        case "explain_method":
          return say(EXPLAIN, "idle")
        case "start_quiz":
          return say(QUIZ, "idle")
        case "category_question": {
          const c = getCategory(ai.category_id)
          return c ? say(ai.lulu_message, "happy", { type: "category", categoryId: c.id }) : say(ai.lulu_message, settle)
        }
        default:
          return say(OFF_TOPIC, "idle")
      }
    },
    [say]
  )

  const send = useCallback(
    async (turn: PendingTurn, opts: { echo?: boolean } = {}) => {
      if (!turn.text.trim() && !turn.image) return
      if (opts.echo !== false) push({ role: "user", text: turn.text || undefined, image: turn.image?.thumbnail })
      // a fresh photo starts a new identification
      if (turn.image) pending.current = null
      setTyping(turn.image || pending.current ? "identify" : "chat")
      setMood("thinking")
      const request: LuluTurn = {
        text: turn.text,
        image: turn.image,
        pending: pending.current,
        lastItem: last.current?.item ?? null,
        recent: messagesRef.current
          .filter((m) => m.text && m.id !== "welcome")
          .slice(-6)
          .map((m) => ({ role: m.role, text: m.text! })),
      }
      try {
        const ai = await askLulu(request)
        setTyping(null)
        handleAI(ai, turn)
      } catch (err) {
        setTyping(null)
        setMood("sorry")
        push({ role: "lulu", card: { type: "error", message: errorMessage(err), retry: turn } })
      }
    },
    [handleAI, push]
  )

  const sendPhoto = async (mode: "camera" | "upload") => {
    const img = await capture(mode)
    if (img) send({ text: text.trim(), image: img }).then(() => setText(""))
  }

  // Quick chips answered by the app itself (no AI needed)
  const local = (userText: string, reply: string, settle: LuluMood, card?: Card) => {
    push({ role: "user", text: userText })
    say(reply, settle, card)
  }

  const close = useCallback(() => setChatOpen(false), [setChatOpen])

  return (
    <Sheet open={chatOpen} onClose={close} panel labelledBy="lulu-title">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-green/12 px-4 py-3">
        <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-0.5">
          <LuluMascot mood={mood} size={44} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="lulu-title" className="display text-2xl leading-none">Lulu</h2>
          <Mark className="mt-1 text-[11px]">Your WasteWise helper</Mark>
        </div>
        <button onClick={close} className="ww-press pill-glass grid h-11 w-11 place-items-center" aria-label="Close chat">
          <X size={20} />
        </button>
      </div>

      {/* messages */}
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ww-fade-up flex flex-col items-end gap-1.5">
              {m.image && <img src={m.image} alt="Your photo" className="h-28 w-28 rotate-[3deg] rounded-[12px] border-[5px] border-white object-cover shadow-soft" />}
              {m.text && <p className="pill max-w-[80%] rounded-[20px] rounded-br-md px-4 py-2.5 text-sm font-normal">{m.text}</p>}
            </div>
          ) : (
            <div key={m.id} className="ww-fade-up flex items-start gap-2">
              <span className="bg-mint rounded-full mt-0.5 grid h-8 w-8 shrink-0 place-items-center">
                <LuluMascot mood="idle" size={24} />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                {m.text && <p className="glass w-fit max-w-full rounded-[20px] rounded-tl-md px-4 py-2.5 text-sm">{m.text}</p>}
                {m.card && (
                  <ChatCard
                    card={m.card}
                    onAnswer={(answer) => {
                      patchCard(m.id, (c) => (c.type === "clarify" ? { ...c, answered: true } : c))
                      send({ text: answer, image: null })
                    }}
                    onRetakePhoto={async () => {
                      const img = await capture("camera")
                      if (img) {
                        patchCard(m.id, (c) => (c.type === "clarify" ? { ...c, answered: true } : c))
                        send({ text: m.card?.type === "clarify" ? m.card.input.description : "", image: img })
                      }
                    }}
                    onGotIt={async () => {
                      const c = m.card
                      if (c?.type !== "outcome") return
                      patchCard(m.id, (x) => (x.type === "outcome" ? { ...x, saved: true } : x))
                      await finishScan({ input: c.input, outcome: c.outcome, originalAi: c.originalAi })
                    }}
                    onCorrect={() => setCorrectingId(m.id)}
                    onRetry={(turn) => send(turn, { echo: false })}
                    onNavigate={close}
                  />
                )}
              </div>
            </div>
          )
        )}
        {typing && <TypingRow mode={typing} />}
      </div>

      {/* quick chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        {[
          { label: "📷 Scan item", run: () => sendPhoto("camera") },
          { label: "📁 Upload photo", run: () => sendPhoto("upload") },
          { label: "✍️ Describe an item", run: () => inputRef.current?.focus() },
          { label: "🕘 My history", run: () => local("Show my history", "Here are your latest scans 🕘", "happy", { type: "history" }) },
          { label: "🏆 My rank", run: () => local("What's my rank?", "Here's where you stand 🏆", "happy", { type: "rank" }) },
          { label: "❓ How do you decide?", run: () => local("How do you decide?", EXPLAIN, "idle") },
        ].map((c) => (
          <button
            key={c.label}
            onClick={c.run}
            disabled={!!typing}
            className="ww-press pill-glass min-h-11 shrink-0 px-4 text-[13px] font-semibold disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* input bar */}
      <form
        className="flex items-center gap-2 border-t border-green/12 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim() || typing) return
          send({ text: text.trim(), image: null })
          setText("")
        }}
      >
        <IconBtn label="Take a photo" onClick={() => sendPhoto("camera")} disabled={!!typing}>
          <Camera size={20} />
        </IconBtn>
        <IconBtn label="Attach a photo" onClick={() => sendPhoto("upload")} disabled={!!typing}>
          <Paperclip size={20} />
        </IconBtn>
        <label className="sr-only" htmlFor="lulu-input">Message Lulu</label>
        <input
          id="lulu-input"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Lulu or describe an item…"
          className="field h-11 min-w-0 flex-1 px-4 text-sm"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim() || !!typing}
          className="ww-press pill grid h-11 w-11 shrink-0 place-items-center disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>

      <CorrectionSheet
        open={!!correctingId}
        onClose={() => setCorrectingId(null)}
        onSubmit={(item) => {
          setCorrectingId(null)
          send({ text: `That's not right, it's actually a ${item}`, image: null })
        }}
      />
    </Sheet>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="ww-press pill-glass grid h-11 w-11 shrink-0 place-items-center disabled:opacity-40">
      {children}
    </button>
  )
}

function TypingRow({ mode }: { mode: "identify" | "chat" }) {
  const step = useAnalysisStep(mode === "identify")
  return (
    <div className="flex items-center gap-2" role="status">
      <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-0.5">
        <LuluMascot mood="thinking" size={32} />
      </span>
      <div className="glass rounded-[20px] rounded-tl-md px-4 py-3">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="ww-dot h-2 w-2 rounded-full bg-white" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </span>
        <span className="mt-1 block text-xs text-sub">{mode === "identify" ? ANALYSIS_STEPS[step] : "Thinking…"}</span>
      </div>
    </div>
  )
}

// ---------- rich cards ----------

interface ChatCardProps {
  card: Card
  onAnswer: (a: string) => void
  onRetakePhoto: () => void
  onGotIt: () => void
  onCorrect: () => void
  onRetry: (turn: PendingTurn) => void
  onNavigate: () => void
}

function ChatCard({ card, onAnswer, onRetakePhoto, onGotIt, onCorrect, onRetry, onNavigate }: ChatCardProps) {
  switch (card.type) {
    case "outcome":
      return (
        <OutcomeView
          compact
          outcome={card.outcome}
          image={card.input.image?.thumbnail ?? null}
          corrected={!!card.input.correctedItem}
          actions={<ResultActions compact saved={card.saved} onGotIt={onGotIt} onCorrect={onCorrect} />}
        />
      )
    case "clarify":
      return (
        <ClarificationCard
          compact
          ai={card.outcome.ai}
          question={card.outcome.question}
          options={card.outcome.options}
          thumbnail={card.input.image?.thumbnail ?? null}
          onAnswer={onAnswer}
          onRetakePhoto={onRetakePhoto}
          disabled={card.answered}
        />
      )
    case "error":
      return <ErrorCard compact message={card.message} onRetry={() => onRetry(card.retry)} />
    case "history":
      return <HistoryChatCard onNavigate={onNavigate} />
    case "stats":
      return <StatsChatCard />
    case "rank":
      return <RankChatCard onNavigate={onNavigate} />
    case "leaderboard":
      return <LeaderboardChatCard onNavigate={onNavigate} />
    case "category":
      return <CategoryChatCard categoryId={card.categoryId} />
  }
}

function MiniCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("ww-fade-up glass p-4", className)}>{children}</div>
}

function SeeAll({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ww-press pill mt-3 flex min-h-11 w-full items-center justify-center gap-1 text-sm">
      {label} <ChevronRight size={16} />
    </button>
  )
}

function HistoryChatCard({ onNavigate }: { onNavigate: () => void }) {
  const { history, navigate } = useApp()
  const items = history.slice(0, 5)
  return (
    <MiniCard>
      <h3 className="display mb-2 text-base">Your recent scans</h3>
      {items.length === 0 ? (
        <p className="text-sm text-sub">No scans yet — send me a photo to start!</p>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <HistoryRow key={e.id} entry={e} onClick={() => (onNavigate(), navigate({ name: "historyDetail", id: e.id }))} />
          ))}
        </div>
      )}
      <SeeAll label="See all" onClick={() => (onNavigate(), navigate({ name: "history" }))} />
    </MiniCard>
  )
}

function StatsChatCard() {
  const s = useStats()
  const lv = levelFor(s.points)
  return (
    <MiniCard>
      <div className="grid grid-cols-3 gap-2">
        <StatTile icon="✨" value={s.itemsToday} label="Items today" />
        <StatTile icon="🔥" value={s.streak} label="Day streak" />
        <StatTile icon="📦" value={s.totalSorted} label="Total sorted" />
      </div>
      <p className="mt-3 text-sm font-semibold">
        {lv.next ? `${lv.toNext} more points to become a ${lv.next.name} ${lv.next.badge}` : "You've reached the top level 🌲✨"}
      </p>
      <div className="mt-2">
        <LevelProgress compact />
      </div>
    </MiniCard>
  )
}

function RankChatCard({ onNavigate }: { onNavigate: () => void }) {
  const { profile, storeMode, navigate } = useApp()
  const weekly = useMyRank("week")
  const allTime = useMyRank("all")
  const s = useStats()
  if (storeMode !== "firebase") return <MiniCard><NotConnectedNote /></MiniCard>
  if (!profile) return <MiniCard><p className="text-sm text-sub">Earn your first Eco Points to join the leaderboard 🌱</p></MiniCard>
  return (
    <MiniCard>
      <div className="grid grid-cols-2 gap-2">
        <StatTile icon="📅" value={weekly ? `#${weekly}` : "—"} label={`This week · ${s.weeklyPoints} pts`} />
        <StatTile icon="🏆" value={allTime ? `#${allTime}` : "—"} label={`All time · ${s.points} pts`} />
      </div>
      <SeeAll label="See full leaderboard" onClick={() => (onNavigate(), navigate({ name: "leaderboard" }))} />
    </MiniCard>
  )
}

function LeaderboardChatCard({ onNavigate }: { onNavigate: () => void }) {
  const { uid, navigate } = useApp()
  const { rows, loading, error, connected } = useLeaderboard("week", 5)
  return (
    <MiniCard>
      <h3 className="display mb-2 text-base">This week's top 5</h3>
      {!connected ? (
        <NotConnectedNote />
      ) : loading ? (
        <p className="text-sm text-sub">Loading…</p>
      ) : error ? (
        <p className="text-sm text-sub">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-sub">No one has scored yet this week. Be the first! 🚀</p>
      ) : (
        <BoardList rows={rows} highlightUid={uid} />
      )}
      <SeeAll label="See full leaderboard" onClick={() => (onNavigate(), navigate({ name: "leaderboard" }))} />
    </MiniCard>
  )
}

function CategoryChatCard({ categoryId }: { categoryId: string }) {
  const c = getCategory(categoryId)!
  const rules = rulesForCategory(categoryId)
  return (
    <MiniCard>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="display text-base">{c.bin}</h3>
        <CategoryChip categoryId={categoryId} />
      </div>
      {rules.length === 0 ? (
        <p className="text-sm text-sub">The campus guide has no items listed for this bin.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {rules.map((r) => (
            <li key={r.rule_id} className="flex gap-2">
              <span className="shrink-0 text-xs font-semibold text-green">{ruleLabel(r.rule_id).replace("Campus Waste Guide ", "")}</span>
              <span className="capitalize">{r.item_names[0]}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-sub">From the {guide.guide_name}</p>
    </MiniCard>
  )
}

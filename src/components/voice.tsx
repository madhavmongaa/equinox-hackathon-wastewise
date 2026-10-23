import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, Square, Volume2 } from "lucide-react"
import { canListen, canSpeak, listen, speak, stopSpeaking, useSpeakingKey, type ListenError } from "@/lib/voice"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"

const ERROR_TEXT: Record<ListenError, string> = {
  denied: "Microphone is blocked. Allow mic access in your browser to talk to Lulu.",
  "no-speech": "Didn't catch that. Tap the mic and try again.",
  network: "Voice input needs an internet connection.",
  other: "Voice input isn't working right now. You can type instead.",
}

/** Mic state for a text field: live transcript while talking, then `onFinal` with the full phrase. */
export function useVoiceInput({ onInterim, onFinal }: { onInterim?: (text: string) => void; onFinal: (text: string) => void }) {
  const { toast } = useApp()
  const [listening, setListening] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const handlers = useRef({ onInterim, onFinal })
  handlers.current = { onInterim, onFinal }

  const stop = useCallback(() => stopRef.current?.(), [])
  const start = useCallback(() => {
    if (stopRef.current) return
    setListening(true)
    stopRef.current = listen({
      onInterim: (t) => handlers.current.onInterim?.(t),
      onFinal: (t) => handlers.current.onFinal(t),
      onError: (kind) => toast(ERROR_TEXT[kind], kind === "no-speech" ? "info" : "error"),
      onEnd: () => {
        stopRef.current = null
        setListening(false)
      },
    })
  }, [toast])

  useEffect(() => () => stopRef.current?.(), [])

  return { supported: canListen(), listening, start, stop, toggle: () => (stopRef.current ? stop() : start()) }
}

/** Round mic button; pulses while listening. Hidden where the browser has no speech recognition. */
export function MicButton({
  listening,
  onClick,
  disabled,
  className,
  size = 44,
}: {
  listening: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
  size?: number
}) {
  if (!canListen()) return null
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? "Stop listening" : "Speak instead of typing"}
      aria-pressed={listening}
      className={cn(
        "ww-press relative grid shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50",
        listening ? "bg-[#C0261B] text-white" : "pill-glass text-green",
        className
      )}
      style={{ width: size, height: size }}
    >
      {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#FF4136]/40" />}
      {listening ? <Square size={size * 0.34} className="relative fill-current" /> : <Mic size={size * 0.44} />}
    </button>
  )
}

/** Reads `text` aloud; tap again to stop. Hidden where the browser can't speak. */
export function ListenButton({ text, speakKey, className, label = "Listen" }: { text: string; speakKey: string; className?: string; label?: string }) {
  const speaking = useSpeakingKey() === speakKey
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      onClick={() => (speaking ? stopSpeaking() : speak(text, speakKey))}
      aria-label={speaking ? "Stop reading aloud" : "Read this answer aloud"}
      aria-pressed={speaking}
      className={cn(
        "ww-press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
        speaking ? "bg-green text-white" : "bg-mint text-green hover:bg-mint/70",
        className
      )}
    >
      {speaking ? <Square size={12} className="fill-current" /> : <Volume2 size={15} />}
      {speaking ? "Stop" : label}
    </button>
  )
}

import { useState } from "react"
import { ArrowRight, Camera, FolderOpen } from "lucide-react"
import { Card, Mark } from "@/components/ui/card"
import { MicButton, useVoiceInput } from "@/components/voice"
import { cn } from "@/lib/utils"
import type { ImageInput } from "@/lib/types"
import { useCapture } from "@/state/capture"

interface IdentifyCardProps {
  onImage: (img: ImageInput) => void
  onText: (text: string) => void
  index?: number
  className?: string
}

/** The heart of the app: 📷 Scan Item · 📁 Upload Photo · or describe it. */
export function IdentifyCard({ onImage, onText, index, className }: IdentifyCardProps) {
  const capture = useCapture()
  const [text, setText] = useState("")
  const mic = useVoiceInput({
    onInterim: setText,
    onFinal: (t) => {
      setText("")
      onText(t)
    },
  })

  const pick = async (mode: "camera" | "upload") => {
    const img = await capture(mode)
    if (img) onImage(img)
  }

  return (
    <Card index={index} className={cn("lg:p-7", className)}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="display text-[28px] leading-tight">Identify your waste</h2>
        <Mark className="mt-1 shrink-0 text-xs">
          Guide first
        </Mark>
      </div>
      <p className="mt-1 text-sm text-sub">Snap it, upload it, or tell Lulu what it is{mic.supported ? " (type or speak)" : ""}.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <BigAction icon={<Camera size={26} />} label="Scan Item" hint="Open camera" onClick={() => pick("camera")} primary />
        <BigAction icon={<FolderOpen size={26} />} label="Upload Photo" hint="JPG, PNG, WEBP, HEIC" onClick={() => pick("upload")} />
      </div>
      <div className="my-4 flex items-center gap-3 text-[11px] font-bold tracking-[0.12em] text-sub">
        <span className="h-px flex-1 bg-green/12" />
        OR DESCRIBE IT
        <span className="h-px flex-1 bg-green/12" />
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) {
            onText(text.trim())
            setText("")
          }
        }}
      >
        <label className="sr-only" htmlFor="describe-item">Describe the item</label>
        <input
          id="describe-item"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mic.listening ? "Listening… say the item" : "e.g. a greasy pizza box…"}
          className="field h-12 min-w-0 flex-1 px-5 text-[15px]"
        />
        <MicButton listening={mic.listening} onClick={mic.toggle} size={48} />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Identify from description"
          className="ww-press pill grid h-12 w-12 shrink-0 place-items-center disabled:opacity-50"
        >
          <ArrowRight size={20} />
        </button>
      </form>
    </Card>
  )
}

function BigAction({ icon, label, hint, onClick, primary }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        "ww-press lift flex min-h-[124px] flex-col items-center justify-center gap-2 rounded-[20px] px-3 py-4 text-center " +
        (primary ? "pill hover:bg-green-2" : "pill-glass rounded-[20px] hover:bg-mint/50")
      }
    >
      <span className={"grid h-12 w-12 place-items-center rounded-full " + (primary ? "bg-white/15 text-white" : "bg-mint text-green")}>{icon}</span>
      <span className="text-[15px] font-semibold">{label}</span>
      <span className={"text-[11px] " + (primary ? "text-white/75" : "text-sub")}>{hint}</span>
    </button>
  )
}

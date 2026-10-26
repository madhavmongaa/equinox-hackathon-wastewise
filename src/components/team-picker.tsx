import { Check } from "lucide-react"
import { TEAMS } from "@/lib/teams"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"

/** Pick (or switch) your area team. Needs a leaderboard profile. */
export function TeamPicker({ className }: { className?: string }) {
  const { profile, openJoin, updateSettings, toast } = useApp()
  const pick = async (id: string) => {
    if (!profile) return openJoin()
    if (profile.team === id) return
    try {
      await updateSettings({ team: id })
      toast(`You're on ${TEAMS.find((t) => t.id === id)?.name} 🤝`, "happy")
    } catch {
      toast("Couldn't save your team. Try again.", "error")
    }
  }
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)} role="radiogroup" aria-label="Your area">
      {TEAMS.map((t) => {
        const on = profile?.team === t.id
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={on}
            onClick={() => pick(t.id)}
            className={cn(
              "ww-press flex min-h-12 items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm font-semibold transition-colors",
              on ? "pill" : "tile hover:border-[var(--ww-line-strong)]"
            )}
          >
            <span aria-hidden="true">{t.emoji}</span>
            <span className="min-w-0 flex-1 truncate">{t.name}</span>
            {on && <Check size={16} className="shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}

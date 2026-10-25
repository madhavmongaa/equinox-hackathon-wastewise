import { useEffect, useMemo, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { AccountButton } from "@/components/account-card"
import { History, House, MapPinned, MessageCircle, ScanLine, Trophy, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Mark } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Sheet } from "@/components/ui/sheet"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { Logo } from "@/components/brand"
import { NicknameFields } from "@/screens/ProfileScreen"
import { AVATARS, validateNickname } from "@/lib/nickname"
import { cn, prefersReducedMotion } from "@/lib/utils"
import { useApp, type Screen } from "@/state/AppContext"

// ---------- bottom nav ----------

const NAV: { name: Screen["name"]; label: string; icon: typeof House }[] = [
  { name: "home", label: "Home", icon: House },
  { name: "scan", label: "Scan", icon: ScanLine },
  { name: "dumps", label: "Dumps", icon: MapPinned },
  { name: "leaderboard", label: "Leaderboard", icon: Trophy },
  { name: "history", label: "History", icon: History },
  { name: "profile", label: "Profile", icon: UserRound },
]

/**
 * Laptop and desktop (≥1024px): a Reelmark-style top bar instead of the bottom tabs.
 * Narrow laptops (lg) get a compact bar: no tagline, text-only tabs, a short Lulu button;
 * from xl the full version fits. The tabs take the space between and never push the buttons off.
 */
export function TopNav() {
  const { screen, navigate, setChatOpen } = useApp()
  const current = screen.name === "historyDetail" ? "history" : screen.name
  return (
    <header className="sticky top-0 z-40 hidden border-b border-green/10 bg-page/90 backdrop-blur lg:block">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-3 px-6 xl:h-[72px] xl:gap-5 xl:px-8">
        <button onClick={() => navigate({ name: "home" })} className="flex shrink-0 items-center gap-2.5" aria-label="WasteWise home">
          <Logo size={34} />
          <span className="text-left">
            <span className="display block text-[21px] leading-none text-green">WasteWise</span>
            <span className="mt-1 hidden text-[11px] text-sub xl:block">Sort smarter. Waste less.</span>
          </span>
        </button>
        <nav className="flex min-w-0 flex-1 items-center justify-center gap-0.5 xl:gap-1" aria-label="Main">
          {NAV.map(({ name, label, icon: Icon }) => {
            const active = current === name
            return (
              <button
                key={name}
                onClick={() => navigate({ name } as Screen)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ww-press flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-[14px] whitespace-nowrap transition-colors xl:px-3.5 xl:text-[15px]",
                  active ? "bg-mint font-medium text-green" : "text-ink hover:text-green"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.4 : 2} className="hidden xl:block" aria-hidden />
                {label}
              </button>
            )
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <AccountButton />
          <Button size="sm" className="shrink-0" onClick={() => setChatOpen(true)} aria-label="Chat with Lulu">
            <MessageCircle size={16} />
            <span className="xl:hidden">Lulu</span>
            <span className="hidden xl:inline">Chat with Lulu</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

export function BottomNav() {
  const { screen, navigate } = useApp()
  const current = screen.name === "historyDetail" ? "history" : screen.name
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] md:max-w-[720px] lg:hidden border-t border-green/10 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Main">
      <ul className="grid grid-cols-6">
        {NAV.map(({ name, label, icon: Icon }) => {
          const active = current === name
          return (
            <li key={name}>
              <button
                onClick={() => navigate({ name } as Screen)}
                aria-current={active ? "page" : undefined}
                className={cn("ww-press flex h-[68px] w-full flex-col items-center justify-center gap-1 text-[10.5px] font-semibold", active ? "text-green" : "text-sub")}
              >
                <span className={cn("grid h-8 w-11 place-items-center rounded-full transition-colors", active && "bg-green text-white")}>
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ---------- Lulu floating button ----------

export function LuluFab() {
  const { setChatOpen, chatOpen } = useApp()
  if (chatOpen) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-40 mx-auto w-full max-w-[480px] px-4 md:max-w-[720px] lg:bottom-8 lg:max-w-none lg:px-8">
      <button
        onClick={() => setChatOpen(true)}
        aria-label="Chat with Lulu"
        title="Chat with Lulu"
        className="ww-press pill-glass pointer-events-auto ml-auto grid h-14 w-14 place-items-center bg-page shadow-[0_8px_24px_rgba(8,72,45,.25)] lg:h-16 lg:w-16"
      >
        <LuluMascot mood="idle" size={46} />
      </button>
    </div>
  )
}

// ---------- toasts ----------

export function Toasts() {
  const { toasts } = useApp()
  const reduced = prefersReducedMotion()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[170px] z-[80] mx-auto flex w-full max-w-[480px] flex-col items-center gap-2 px-4 lg:bottom-28" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lift",
            !reduced && "ww-toast",
            t.tone === "points" && "pill px-6 text-base",
            t.tone === "happy" && "pill",
            t.tone === "info" && "pill-glass",
            t.tone === "error" && "bg-cat-hazardous text-white"
          )}
          style={t.tone === "error" ? { animationDuration: "4.2s" } : undefined}
        >
          {t.tone === "happy" && <LuluMascot mood="happy" size={28} />}
          {t.text}
        </div>
      ))}
    </div>
  )
}

// ---------- joining the leaderboard ----------

export function JoinSheet() {
  const { joinOpen, closeJoin, join } = useApp()
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [show, setShow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setError(null), [name])

  return (
    <Sheet open={joinOpen} onClose={closeJoin} labelledBy="join-title">
      <form
        className="space-y-4 overflow-y-auto px-5 pt-6 pb-8"
        onSubmit={async (e) => {
          e.preventDefault()
          const v = validateNickname(name)
          if (v) return setError(v)
          setBusy(true)
          try {
            await join(name, avatar, show)
          } catch (ex) {
            setError(ex instanceof Error ? ex.message : "Couldn't join right now. Try again.")
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="flex items-center gap-3">
          <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1">
            <LuluMascot mood="happy" size={60} />
          </span>
          <h2 id="join-title" className="display text-2xl leading-tight">
            You earned your first Eco Points! 🌱 Pick a nickname for the campus leaderboard.
          </h2>
        </div>
        <NicknameFields name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} error={error} />
        <div className="tile flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Show me on the public leaderboard</p>
            <p className="text-xs text-sub">You can change this later in Profile.</p>
          </div>
          <Switch label="Show me on the public leaderboard" checked={show} onChange={setShow} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Joining…" : "Claim my points"}
        </Button>
      </form>
    </Sheet>
  )
}

// ---------- level up ----------

export function LevelUpCard() {
  const { levelUp, dismissLevelUp } = useApp()
  const reduced = prefersReducedMotion()
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        dx: `${(Math.random() - 0.5) * 120}px`,
        rot: `${Math.random() * 720 - 360}deg`,
        dur: `${2 + Math.random() * 1.6}s`,
        delay: `${Math.random() * 0.5}s`,
        color: ["#2E7D4F", "#8FB996", "#E0A526", "#2F6FD6", "#7CF0B4"][i % 5],
      })),
    [levelUp]
  )
  if (!levelUp) return null
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center px-4" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
      <div className="ww-fade absolute inset-0 bg-ink/30" onClick={dismissLevelUp} aria-hidden="true" />
      {!reduced && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {pieces.map((p, i) => (
            <span
              key={i}
              className="ww-confetti absolute top-0 h-3 w-2 rounded-[2px]"
              style={{ left: `${p.left}%`, background: p.color, ["--dx" as string]: p.dx, ["--rot" as string]: p.rot, ["--dur" as string]: p.dur, ["--delay" as string]: p.delay }}
            />
          ))}
        </div>
      )}
      <div className="sky-sheet ww-pop relative w-full max-w-[440px] rounded-[24px] border border-green/12 px-6 py-8 text-center shadow-lift">
        <span className="bg-mint mx-auto grid w-fit aspect-square place-items-center overflow-hidden rounded-full p-2">
          <LuluMascot mood="happy" size={96} />
        </span>
        <div className="mt-2 text-5xl" aria-hidden="true">{levelUp.badge}</div>
        <Mark className="mt-3 text-base">New level!</Mark>
        <h2 id="levelup-title" className="display mt-2 text-4xl leading-tight">You're now a {levelUp.name}!</h2>
        <p className="mt-2 text-sm text-sub">Every item sorted right helps the campus. Keep going!</p>
        <Button size="lg" className="mt-6 w-full" onClick={dismissLevelUp}>
          Keep sorting
        </Button>
      </div>
    </div>
  )
}

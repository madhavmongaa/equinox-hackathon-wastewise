import { useEffect, useState } from "react"
import type { Profile } from "@/lib/types"
import { ArrowLeft, Award, CheckCircle2, Flame, Hash, Lock, Package, Pencil, Sparkles, Star, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { LevelBadge } from "@/components/brand"
import { AccountCard } from "@/components/account-card"
import { ScanFootprint } from "@/components/scan-footprint"
import { TeamPicker } from "@/components/team-picker"
import { ThemeChoice } from "@/components/theme-toggle"
import { Avatar, StatTile } from "@/components/widgets"
import { useMyRank } from "@/hooks/useLeaderboard"
import { useStats } from "@/hooks/useStats"
import { CATEGORIES } from "@/lib/categories"
import { BADGES, LEVELS } from "@/lib/levels"
import { POINTS } from "@/lib/points"
import { AVATARS, NICKNAME_HINT, validateNickname } from "@/lib/nickname"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"
import { setLang, useLang } from "@/lib/i18n"

export function ProfileScreen() {
  const { navigate, profile, openJoin, updateSettings, toast, storeMode, history } = useApp()
  const s = useStats()
  const weeklyRank = useMyRank("week")
  const [editing, setEditing] = useState(false)

  const maxCat = Math.max(1, ...Object.values(s.byCategory))
  const cats = [...CATEGORIES.map((c) => ({ id: c.id, label: c.label, color: c.color })), { id: "none", label: "Not sorted", color: "#5B6770" }]

  const newBadges = useNewBadges(profile)

  const currentLevelNumber = s.level.index + 1
  const pct = Math.round(Math.max(0, Math.min(1, s.level.progress)) * 100)

  return (
    <div className="space-y-4 px-4 pt-4 pb-32 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0 lg:pt-8 lg:pb-16">
      <header className="flex items-center gap-2 lg:col-span-2">
        <Button variant="secondary" size="icon" aria-label="Back to Home" onClick={() => navigate({ name: "home" })}>
          <ArrowLeft size={22} />
        </Button>
        <h1 className="display text-3xl">Profile</h1>
      </header>

      <AccountCard className="lg:col-span-2" />

      {/* 1. User Identity & Current Level Card */}
      <Card index={0}>
        <div className="flex items-center gap-4">
          {profile ? (
            <Avatar emoji={profile.avatar} size={64} />
          ) : (
            <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1">
              <LuluMascot mood="idle" size={56} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className={cn("display leading-tight", profile ? "truncate text-3xl" : "text-2xl")}>
              {profile?.displayName ?? "Eco Sorter"}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="pill inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white shadow-soft">
                <span>Level {currentLevelNumber}</span>
                <span>&middot;</span>
                <span>{s.level.level.name}</span>
                <span>{s.level.level.badge}</span>
              </span>
              <span className="pill-glass inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-green">
                <Zap size={13} className="fill-green text-green" />
                {s.points} XP
              </span>
            </div>
          </div>
          {profile && (
            <Button variant="secondary" size="icon" aria-label="Edit nickname and avatar" onClick={() => setEditing(true)}>
              <Pencil size={18} />
            </Button>
          )}
        </div>

        {!profile && (
          <Button className="mt-4 w-full" onClick={openJoin}>
            Pick a nickname for the leaderboard
          </Button>
        )}
      </Card>

      {/* 2. Level Progression & Experience (XP) Card */}
      <Card index={1}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-green" />
            <h2 className="display text-lg">Level Progression</h2>
          </div>
          <span className="pill-glass px-2.5 py-0.5 text-xs font-bold text-green">{pct}% to next level</span>
        </div>

        {/* Current Level Feature Banner */}
        <div className="pill relative overflow-hidden rounded-[20px] p-4 text-white shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-mint uppercase">Current Level</div>
              <div className="mt-0.5 flex items-center gap-2 text-2xl font-bold">
                <span>Level {currentLevelNumber}</span>
                <span>&middot;</span>
                <span>{s.level.level.name}</span>
                <span className="text-2xl">{s.level.level.badge}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-mint">Total XP</div>
              <div className="text-2xl font-bold">{s.points} XP</div>
            </div>
          </div>

          <div className="mt-3">
            <Progress value={s.level.progress} barClassName="bg-mint" className="bg-white/20 h-2.5" label="Level progress" />
            <div className="mt-2 flex items-center justify-between text-xs text-white/85">
              <span>{s.points} XP</span>
              <span className="font-medium">{s.nextText}</span>
            </div>
          </div>
        </div>

        {/* Level Tiers Ladder */}
        <div className="mt-4 space-y-2">
          <span className="text-xs font-semibold text-sub block">Level Tiers</span>
          {LEVELS.map((lvl, idx) => {
            const isCurrent = s.level.index === idx
            const isUnlocked = s.points >= lvl.min
            return (
              <div
                key={lvl.name}
                className={cn(
                  "flex items-center justify-between rounded-[14px] px-3.5 py-2 text-xs transition-colors",
                  isCurrent ? "pill font-bold" : isUnlocked ? "tile text-ink" : "tile opacity-55"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base" aria-hidden="true">{lvl.badge}</span>
                  <span className="font-semibold">Level {idx + 1} &middot; {lvl.name}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-green">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono">
                  {isUnlocked ? (
                    <span className={cn("flex items-center gap-1", isCurrent ? "text-mint" : "text-green font-semibold")}>
                      <CheckCircle2 size={13} /> {lvl.min} XP
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sub">
                      <Lock size={12} /> {lvl.min} XP
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 3. Points & XP System Breakdown */}
      <Card index={2}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-green" />
            <h2 className="display text-lg">Scan Points System</h2>
          </div>
          <span className="pill-glass px-2.5 py-0.5 text-[11px] font-bold text-green">Earn on every scan</span>
        </div>
        <p className="mb-3 text-xs text-sub">Experience points (XP) are awarded for each item you identify and prepare for recycling.</p>
        <div className="space-y-2">
          <XpRuleRow icon="📸" title="Successful Item Scan" desc="Item identified and sorted into a bin" xp={`+${POINTS.sortedResult} XP`} />
          <XpRuleRow icon="🌅" title="First Scan of the Day" desc="Daily active sorter bonus" xp={`+${POINTS.firstScanOfDay} XP`} />
          <XpRuleRow icon="💬" title="Clarification Answered" desc="Helped Lulu verify material details" xp={`+${POINTS.clarification} XP`} />
          <XpRuleRow icon="🛠️" title="Community Correction" desc="Fixed an item identification" xp={`+${POINTS.correction} XP`} />
          <XpRuleRow icon="🔥" title="7-Day Streak" desc="Sorted 7 consecutive days" xp={`+${POINTS.streak7} XP`} />
          <XpRuleRow icon="🎯" title="Weekly Challenge" desc="Finish and claim a weekly challenge" xp={`+${POINTS.challenge} XP`} />
          <XpRuleRow icon="📍" title="Dump Report" desc="Reported an illegal dump" xp={`+${POINTS.dumpReport} XP`} />
        </div>
      </Card>

      {/* 4. Your Stats */}
      <Card index={3}>
        <h2 className="display mb-3 text-lg">Your stats</h2>
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={<Star size={16} />} value={`${s.points} XP`} label="Total XP" />
          <StatTile icon={<Zap size={16} />} value={`Lvl ${currentLevelNumber}`} label="Current level" />
          <StatTile icon={<Hash size={16} />} value={weeklyRank ? `#${weeklyRank}` : "—"} label="Weekly rank" />
          <StatTile icon={<Package size={16} />} value={s.totalSorted} label="Items sorted" />
          <StatTile icon={<Flame size={16} />} value={s.streak} label="Day streak" />
          <StatTile icon={<Award size={16} />} value={profile ? BADGES.filter((b) => b.earned(profile)).length : 0} label="Badges" />
        </div>
        {storeMode === "local" && <p className="mt-3 text-xs text-sub">Weekly rank appears once the leaderboard is connected.</p>}
      </Card>

      {/* 5. What you've sorted */}
      <Card index={4}>
        <h2 className="display mb-3 text-lg">What you've sorted</h2>
        {history.length === 0 ? (
          <p className="text-sm text-sub">Scan your first item to see your category breakdown.</p>
        ) : (
          <div className="space-y-2.5">
            {cats.map((c) => {
              const n = s.byCategory[c.id] ?? 0
              return (
                <div key={c.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold">{c.label}</span>
                    <span className="text-sub">{n}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-mint">
                    <div className="h-full rounded-full border border-green/12" style={{ width: `${(n / maxCat) * 100}%`, background: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* 5b. Where you've sorted */}
      <Card index={4}>
        <ScanFootprint />
      </Card>

      {/* 5c. Team */}
      <Card index={5}>
        <h2 className="display text-lg">Your area</h2>
        <p className="mb-3 text-xs text-sub">Your weekly points also count for your area on the leaderboard, and Home shows its collection times.</p>
        <TeamPicker className="sm:grid-cols-2" />
      </Card>

      {/* 6. Badges */}
      <Card index={5}>
        <h2 className="display mb-3 text-lg">Badges</h2>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((b) => {
            const earned = !!profile && b.earned(profile)
            const fresh = earned && newBadges.includes(b.id)
            return (
              <div key={b.id} className={cn("rounded-[16px] px-3 py-3", earned ? "pill rounded-[16px]" : "tile opacity-60", fresh && "ww-shine ww-pop")}>
                <div className="text-2xl" aria-hidden="true">{b.emoji}</div>
                <div className="mt-1 text-sm font-semibold">{b.name}</div>
                <div className={cn("text-[11px]", earned ? "text-white/75" : "text-sub")}>{earned ? "Earned" : b.description}</div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card index={6} className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="display text-lg">Appearance</h2>
            <p className="text-xs text-sub">Light is the default. Your choice is saved on this device.</p>
          </div>
          <ThemeChoice />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ww-line)] pt-4">
          <div>
            <h2 className="display text-lg">Language</h2>
            <p className="text-xs text-sub">Menus, Home and Lulu's replies.</p>
          </div>
          <LanguageChoice />
        </div>
      </Card>

      {profile && (
        <Card index={6} className="lg:col-span-2">
          <h2 className="display mb-3 text-lg">Settings</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Show me on the public leaderboard</p>
              <p className="text-xs text-sub">Hidden users still earn points and see their own rank.</p>
            </div>
            <Switch
              label="Show me on the public leaderboard"
              checked={profile.showOnLeaderboard}
              onChange={(v) => updateSettings({ showOnLeaderboard: v }).catch(() => toast("Couldn't save that setting.", "error"))}
            />
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={() => setEditing(true)}>
            Change nickname or avatar
          </Button>
        </Card>
      )}

      <Card index={7} className="lg:col-span-2">
        <h2 className="display mb-3 text-lg">More</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoreLink emoji="🗺️" title="Bin map" desc="Nearest bin of each colour" onClick={() => navigate({ name: "bins" })} />
          <MoreLink emoji="🌍" title="Your impact" desc="CO₂ and landfill savings" onClick={() => navigate({ name: "impact" })} />
          <MoreLink emoji="📊" title="Community dashboard" desc="Dumps and participation by area" onClick={() => navigate({ name: "admin" })} />
        </div>
      </Card>

      {profile && editing && (
        <EditProfileCard
          name={profile.displayName}
          avatar={profile.avatar}
          onCancel={() => setEditing(false)}
          onSave={async (name, avatar) => {
            await updateSettings({ displayName: name, avatar })
            setEditing(false)
            toast("Profile updated 🌱", "info")
          }}
        />
      )}
    </div>
  )
}

function XpRuleRow({ icon, title, desc, xp }: { icon: string; title: string; desc: string; xp: string }) {
  return (
    <div className="tile flex items-center justify-between gap-3 rounded-[16px] px-3.5 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xl shrink-0" aria-hidden="true">{icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          <div className="text-[11px] text-sub truncate">{desc}</div>
        </div>
      </div>
      <span className="pill shrink-0 px-2.5 py-1 text-xs font-bold text-white shadow-soft">{xp}</span>
    </div>
  )
}

function EditProfileCard({ name, avatar, onSave, onCancel }: { name: string; avatar: string; onSave: (n: string, a: string) => Promise<void>; onCancel: () => void }) {
  const [n, setN] = useState(name)
  const [a, setA] = useState(avatar)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setErr(null), [n])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end lg:place-items-center">
      <div className="ww-fade absolute inset-0 bg-ink/30" onClick={onCancel} aria-hidden="true" />
      <form
        className="sky-sheet ww-sheet relative mx-auto w-full max-w-[480px] space-y-4 rounded-t-[28px] px-5 pt-5 pb-8 lg:max-w-[540px] lg:rounded-[28px] lg:p-7"
        onSubmit={async (e) => {
          e.preventDefault()
          const v = validateNickname(n)
          if (v) return setErr(v)
          setBusy(true)
          try {
            await onSave(n, a)
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : "Couldn't save. Try again.")
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="display text-3xl">Edit profile</h2>
        <NicknameFields name={n} setName={setN} avatar={a} setAvatar={setA} error={err} />
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={busy}>Save</Button>
        </div>
      </form>
    </div>
  )
}

export function NicknameFields({ name, setName, avatar, setAvatar, error }: { name: string; setName: (v: string) => void; avatar: string; setAvatar: (v: string) => void; error: string | null }) {
  return (
    <>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Nickname</span>
        <input
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. GreenMadhav"
          className="field h-12 w-full px-5 text-[15px]"
          aria-describedby="nickname-hint"
        />
        <span id="nickname-hint" className={cn("mt-1.5 block text-xs", error ? "font-semibold text-green" : "text-sub")}>
          {error ?? NICKNAME_HINT}
        </span>
      </label>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Avatar</span>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setAvatar(e)}
              aria-label={`Avatar ${e}`}
              aria-pressed={avatar === e}
              className={cn("ww-press grid h-12 w-12 place-items-center rounded-full bg-card text-2xl shadow-soft", avatar === e && "ring-4 ring-green")}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

const SEEN_BADGES_KEY = "wastewise.seenBadges.v1"

/** Badges earned since this device last showed the Profile page (they get a shine once). */
function useNewBadges(profile: Profile | null) {
  const [fresh, setFresh] = useState<string[]>([])
  const earned = profile ? BADGES.filter((b) => b.earned(profile)).map((b) => b.id) : []
  const key = earned.join()
  useEffect(() => {
    if (!profile) return
    let seen: string[] = []
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_BADGES_KEY) ?? "[]")
    } catch {
      /* first visit */
    }
    const ids = key ? key.split(",") : []
    const news = ids.filter((id) => !seen.includes(id))
    if (news.length) setFresh((f) => [...new Set([...f, ...news])])
    try {
      localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify([...new Set([...seen, ...ids])]))
    } catch {
      /* storage blocked */
    }
  }, [key, profile])
  return fresh
}

function LanguageChoice() {
  const lang = useLang()
  return (
    <div className="pill-glass grid grid-cols-2 p-1" role="radiogroup" aria-label="Language">
      {(
        [
          ["en", "English"],
          ["hi", "हिन्दी"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          role="radio"
          aria-checked={lang === id}
          onClick={() => setLang(id)}
          className={cn("h-10 rounded-full px-4 text-sm font-semibold transition-colors", lang === id ? "bg-mint text-green shadow-soft" : "text-sub")}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function MoreLink({ emoji, title, desc, onClick }: { emoji: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ww-press tile flex items-center gap-3 px-3.5 py-3 text-left hover:border-[var(--ww-line-strong)]">
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-sub">{desc}</span>
      </span>
    </button>
  )
}

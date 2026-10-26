import { Camera, Leaf, MapPin, MapPinned, Recycle, Sparkles } from "lucide-react"
import { Card, Note, SectionTitle } from "@/components/ui/card"
import { HOME_AREA, EarthGlobe } from "@/components/earth-globe"
import { LuluMascot } from "@/components/ui/LuluMascot"
import { Logo } from "@/components/brand"
import { IdentifyCard } from "@/components/identify-card"
import { ThemeToggle } from "@/components/theme-toggle"
import { AccountAvatar } from "@/components/account-card"
import { ChallengesCard } from "@/components/challenges-card"
import { ImpactCard } from "@/components/impact-card"
import { InstallCard, OfflineScansCard, PickupCard } from "@/components/home-extras"
import { HistoryRow, LeaderboardPreviewCard } from "@/components/widgets"
import { useMemo, useState } from "react"
import { uuid } from "@/lib/utils"
import { useMockRecentScans } from "@/lib/mockScansStore"
import { SEVERITY_COLOR, SEVERITY_ORDER, useActiveDumps } from "@/dumps/severity"
import type { GlobeFocus, GlobeMarker } from "@/components/ui/3d-globe"
import { useApp } from "@/state/AppContext"
import { t, useLang } from "@/lib/i18n"
import { useCapture } from "@/state/capture"

export function HomeScreen() {
  const { navigate, history } = useApp()
  const lang = useLang()
  const capture = useCapture()
  const recent = useMockRecentScans(history)

  const handleCameraScan = async () => {
    try {
      const img = await capture("camera")
      if (img) {
        navigate({ name: "scan", start: { key: uuid(), image: img } })
      }
    } catch {
      navigate({ name: "scan" })
    }
  }

  return (
    <div className="space-y-4 px-4 pt-4 pb-28 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6 lg:space-y-0 lg:pt-8 lg:pb-16">
      {/* 1. Header */}
      <header className="ww-fade-up flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo size={38} />
          <div>
            <h1 className="display text-[22px] leading-none text-green">WasteWise</h1>
            <p className="mt-1 text-xs text-sub">Sort smarter. Waste less.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => navigate({ name: "profile" })} className="ww-press pill-glass grid h-11 w-11 place-items-center" aria-label="Profile">
            <AccountAvatar size={34} />
          </button>
        </div>
      </header>

      {/* 2. Greeting — the Reelmark headline block */}
      <section
        className="ww-fade-up relative pt-3 pb-1 text-center lg:col-span-6 lg:self-center lg:pt-0 lg:pr-6 lg:text-left"
        style={{ animationDelay: "40ms" }}
      >
        <h2 className="display text-[44px] leading-[1.04] lg:text-[76px] lg:leading-[0.98]">
          {t("Let's sort it", lang)}
          <br />
          <span className="whitespace-nowrap" style={{ letterSpacing: "-0.022em" }}>
            {t("right 🌱", lang)}
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-relaxed text-sub lg:mx-0 lg:mt-5 lg:max-w-[440px] lg:text-lg">
          {t("Not sure which bin to use? Lulu will tell you.", lang)}
        </p>
        <div className="relative mt-3 flex items-center justify-center lg:mt-7 lg:justify-start">
          <span className="bg-mint grid shrink-0 aspect-square place-items-center overflow-hidden rounded-full p-1">
            <LuluMascot mood="idle" size={72} />
          </span>
          <div className="absolute top-0 right-[calc(50%+56px)] flex flex-col items-end lg:right-auto lg:left-[104px] lg:items-start">
            <Note tilt={-12} className="text-[24px]">
              {t("Ask Lulu!", lang)}
            </Note>
            <svg className="ww-draw mt-0.5 mr-[-18px] h-9 w-12 lg:mr-0 lg:ml-[-22px] lg:-scale-x-100" viewBox="0 0 48 36" aria-hidden="true">
              <path pathLength={1} d="M6 4 C10 20 22 28 40 26" fill="none" stroke="#08482D" strokeWidth={2.2} strokeLinecap="round" />
              <path pathLength={1} d="M40 26 L31 20 M40 26 L31 31" fill="none" stroke="#08482D" strokeWidth={2.2} strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. Identify your waste */}
      <IdentifyCard
        index={2}
        className="lg:col-span-6"
        onImage={(image) => navigate({ name: "scan", start: { key: uuid(), image } })}
        onText={(text) => navigate({ name: "scan", start: { key: uuid(), text } })}
      />

      {/* 4. Quick links */}
      <div className="ww-fade-up grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-12 lg:gap-6" style={{ animationDelay: "120ms" }}>
        <QuickLink icon={<Leaf size={20} />} label={t("Your impact", lang)} note={t("CO₂ saved", lang)} onClick={() => navigate({ name: "impact" })} />
        <QuickLink icon={<MapPin size={20} />} label={t("Bin map", lang)} note={t("Nearest bin", lang)} onClick={() => navigate({ name: "bins" })} />
        <QuickLink icon={<Recycle size={20} />} label={t("Kabadiwala", lang)} note={t("Sell your scrap", lang)} onClick={() => navigate({ name: "kabadiwala" })} />
        <QuickLink icon={<Sparkles size={20} />} label={t("Cleaning", lang)} note={t("Services nearby", lang)} onClick={() => navigate({ name: "cleaning" })} />
      </div>

      {/* offline scans waiting / install offer (only when there's something to say) */}
      <OfflineScansCard className="lg:col-span-12" />
      <InstallCard className="lg:col-span-12" />

      {/* 5. This week: challenges + your progress */}
      <ChallengesCard index={3} className="lg:col-span-7" />
      <ImpactCard index={4} className="lg:col-span-5" />

      {/* 6. Recent scans + pickups + leaderboard */}
      <Card index={5} className="lg:col-span-4">
        <SectionTitle
          action={
            <button onClick={() => navigate({ name: "history" })} className="ww-press pill-glass min-h-10 px-4 text-sm font-semibold">
              {t("See all", lang)}
            </button>
          }
        >
          {t("Recent scans", lang)}
        </SectionTitle>
        <div className="space-y-2.5">
          {recent.map((e) => (
            <HistoryRow key={e.id} entry={e} onClick={() => navigate({ name: "historyDetail", id: e.id })} />
          ))}
        </div>
      </Card>
      <PickupCard index={6} className="lg:col-span-4" />
      <LeaderboardPreviewCard index={7} className="lg:col-span-4" />

      {/* 7. Globe: every reported illegal dump */}
      <DumpGlobe />

      {/* 10. Floating Action Button — Scan with Camera */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-40 mx-auto flex w-full max-w-[480px] items-center justify-center px-4 md:max-w-[720px] lg:bottom-8 lg:max-w-none lg:justify-end lg:pr-28">
        <button
          onClick={handleCameraScan}
          aria-label="Scan object with camera"
          className="ww-press lift pill pointer-events-auto flex items-center gap-2.5 rounded-full bg-green px-5 py-3.5 text-white shadow-[0_10px_30px_rgba(8,72,45,0.4)] border border-mint/25 hover:bg-green-2 transition-all hover:scale-105 active:scale-95"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-mint">
            <Camera size={18} strokeWidth={2.4} />
          </span>
          <span className="text-[14px] font-bold tracking-tight">{t("Scan Object", lang)}</span>
        </button>
      </div>
    </div>
  )
}

function QuickLink({ icon, label, note, onClick }: { icon: React.ReactNode; label: string; note?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ww-press glass lift flex min-h-[88px] flex-col items-center justify-center gap-1.5 px-2 py-3 lg:min-h-[76px] lg:flex-row lg:justify-start lg:gap-3 lg:px-5"
    >
      <span className="pill grid h-9 w-9 place-items-center rounded-full">{icon}</span>
      <span className="text-[13px] font-semibold lg:text-[15px]">{label}</span>
      {note && <span className="-mt-1 text-[11px] text-sub lg:mt-0 lg:ml-auto lg:text-xs">{note}</span>}
    </button>
  )
}

/** Home globe: the home pin plus active illegal dumps, coloured by severity; a pin opens that dump. */
function DumpGlobe() {
  const { navigate } = useApp()
  const { dumps, loaded } = useActiveDumps()
  const [hovered, setHovered] = useState<string | null>(null)
  // open facing the home area (where the reports are), then let it spin
  const [focus, setFocus] = useState<GlobeFocus | null>({ ...HOME_AREA, distance: 3.5 })
  const markers = useMemo<GlobeMarker[]>(
    () => dumps.map((d) => ({ lat: d.location.lat, lng: d.location.lng, color: SEVERITY_COLOR[d.severity], size: 9, label: d.title, id: d.id })),
    [dumps]
  )
  const kg = dumps.reduce((n, d) => n + d.estimatedWeightKg, 0)
  const present = SEVERITY_ORDER.filter((s) => dumps.some((d) => d.severity === s))
  return (
    <section className="glass flex flex-col items-center px-5 pt-6 pb-6 lg:col-span-12 lg:flex-row lg:gap-10 lg:px-10 lg:py-6">
      <div className="mint-glow w-full max-w-[360px] shrink-0 rounded-full">
        <EarthGlobe
          className="h-[300px] lg:h-[320px]"
          markers={markers}
          label={`Rotating globe with ${dumps.length} reported dumps`}
          onMarkerHover={(m) => setHovered(m?.label ?? null)}
          onMarkerClick={(m) => (m.id && m.id !== "home" ? navigate({ name: "dumps", dumpId: m.id }) : navigate({ name: "dumps" }))}
          focus={focus}
          onFocusArrive={() => setFocus(null)}
        />
      </div>
      <div className="mt-3 w-full max-w-[460px] text-center lg:mt-0 lg:text-left">
        <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">Community cleanup</p>
        <h2 className="display mt-1 text-2xl lg:text-[32px]">Illegal dumps near you</h2>
        {loaded && dumps.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-sub" aria-live="polite">
              {hovered ?? (
                <>
                  <span className="font-semibold text-ink">{dumps.length} illegal dumps</span> reported · {kg.toLocaleString()} kg · tap a pin
                </>
              )}
            </p>
            <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-sub lg:justify-start" aria-label="Pin colours">
              {present.map((s) => (
                <li key={s} className="inline-flex items-center gap-1.5 capitalize">
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white" style={{ backgroundColor: SEVERITY_COLOR[s] }} />
                  {s}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate({ name: "dumps" })}
              className="ww-press pill mt-4 inline-flex min-h-11 items-center gap-1.5 px-5 text-sm font-semibold"
            >
              <MapPinned size={16} /> Open the dumps map
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-sub">No open reports right now. Sorting right, one item at a time 🌍</p>
        )}
      </div>
    </section>
  )
}

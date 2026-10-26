// Cleaning services nearby, laid out like a home-services app:
// search, a category grid, online platforms, local cleaners and a Google Maps search.

import { useEffect, useMemo, useState } from "react"
import { Bath, BadgeCheck, Bug, Building2, CookingPot, Droplets, ExternalLink, LocateFixed, MapPin, Phone, Search, Sofa, Sparkles, Star, UsersRound, type LucideIcon } from "lucide-react"
import { HOME_AREA } from "@/components/earth-globe"
import { CHECKED_ON, CLEANING_CATEGORIES, CLEANING_PROVIDERS, type CleaningCategory, type CleaningProvider } from "@/data/cleaningServices"
import { currentLocation } from "@/lib/location"
import { cn } from "@/lib/utils"

const ICONS: Record<CleaningCategory, LucideIcon> = {
  home: Sparkles,
  kitchen: CookingPot,
  bathroom: Bath,
  sofa: Sofa,
  pest: Bug,
  tank: Droplets,
  office: Building2,
  staff: UsersRound,
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`

interface LivePlace {
  id: string
  name: string
  address?: string
  distanceKm?: number
  rating?: number
  reviews?: number
  phone?: string
  openNow?: boolean
  mapsUrl: string
}

/** Live Google Places results for a cleaning category near a point (searched by our server). */
function useLivePlaces(category: CleaningCategory, lat: number, lng: number) {
  const [state, setState] = useState<{ places: LivePlace[]; status: "loading" | "ok" | "no_key" | "error" }>({ places: [], status: "loading" })
  useEffect(() => {
    let alive = true
    setState({ places: [], status: "loading" })
    fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: `clean-${category}`, lat, lng }),
    })
      .then((r) => r.json())
      .then((j) => alive && setState({ places: j.places ?? [], status: j.status ?? "error" }))
      .catch(() => alive && setState({ places: [], status: "error" }))
    return () => {
      alive = false
    }
  }, [category, lat, lng])
  return state
}

export function CleaningScreen() {
  const [category, setCategory] = useState<CleaningCategory | null>(null)
  const [query, setQuery] = useState("")
  const [place, setPlace] = useState<{ lat: number; lng: number; mine: boolean }>({ ...HOME_AREA, mine: false })
  const [locating, setLocating] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CLEANING_PROVIDERS.filter(
      (p) =>
        (!category || p.categories.includes(category)) &&
        (!q || [p.name, p.area, ...p.services].some((s) => s.toLowerCase().includes(q)))
    )
  }, [category, query])
  const platforms = matches.filter((p) => p.kind === "platform")
  const locals = matches.filter((p) => p.kind === "local")
  const cat = CLEANING_CATEGORIES.find((c) => c.id === category)
  const liveCat = category ?? "home"
  const live = useLivePlaces(liveCat, place.lat, place.lng)
  const liveLabel = CLEANING_CATEGORIES.find((c) => c.id === liveCat)!.label
  const liveShown = live.places.filter((p) => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)

  const useMine = async () => {
    setLocating(true)
    const here = await currentLocation()
    setLocating(false)
    if (here) setPlace({ ...here, mine: true })
  }
  const mapsSearch = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${place.lat},${place.lng},13z`

  return (
    <div className="space-y-5 px-4 pt-4 pb-32 lg:mx-auto lg:max-w-[960px] lg:pt-8 lg:pb-16">
      <header>
        <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">Home & office services</p>
        <h1 className="display text-3xl lg:text-[40px]">Cleaning services</h1>
        <p className="mt-0.5 text-sm text-sub">Cleaners around Sohna and Gurugram, from deep cleans to pest control.</p>
      </header>

      <label className="relative block">
        <span className="sr-only">Search cleaning services</span>
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sub" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sofa, termite, bathroom…"
          className="field h-12 w-full pr-4 pl-11 text-[15px]"
        />
      </label>

      {/* categories */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="Service categories">
        {CLEANING_CATEGORIES.map((c) => {
          const Icon = ICONS[c.id]
          const on = category === c.id
          return (
            <button
              key={c.id}
              onClick={() => setCategory(on ? null : c.id)}
              aria-pressed={on}
              className={cn(
                "ww-press flex flex-col items-center gap-1.5 rounded-[18px] px-1 py-3 text-center text-[11px] leading-tight font-semibold sm:text-xs",
                on ? "bg-green text-white shadow-soft" : "glass text-ink"
              )}
            >
              <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", on ? "bg-white/15" : "bg-mint text-green")}>
                <Icon size={22} />
              </span>
              {c.label}
            </button>
          )
        })}
      </div>

      {matches.length === 0 && (
        <p className="tile px-4 py-3 text-sm text-ink">
          No listed cleaners match{cat ? ` "${cat.label}"` : ""}{query ? ` "${query}"` : ""} yet. Try the Google Maps search below.
        </p>
      )}

      {live.status !== "no_key" && (
        <section className="space-y-3" aria-live="polite">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Top rated {place.mine ? "near you" : "in Sohna"}</h2>
              <p className="text-xs text-sub">
                {liveLabel} · live from Google Maps
              </p>
            </div>
          </div>
          {live.status === "loading" && <p className="tile px-4 py-3 text-sm text-sub">Looking up {liveLabel.toLowerCase()} cleaners nearby…</p>}
          {live.status === "error" && <p className="tile px-4 py-3 text-sm text-sub">Google listings didn't load right now. The listings below and the Maps search still work.</p>}
          {live.status === "ok" && liveShown.length === 0 && <p className="tile px-4 py-3 text-sm text-sub">No Google listings matched here. Try another category or the Maps search below.</p>}
          {liveShown.length > 0 && (
            <ul className="grid gap-3 lg:grid-cols-2">
              {liveShown.map((p) => (
                <li key={p.id} className="glass flex flex-col gap-2 p-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-ink">{p.name}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                      {p.rating !== undefined && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                          <Star size={12} className="fill-current text-[#F5B400]" /> {p.rating.toFixed(1)}
                          <span className="font-normal text-sub">({p.reviews ?? 0})</span>
                        </span>
                      )}
                      {p.distanceKm !== undefined && <span className="text-sub">{p.distanceKm} km</span>}
                      {p.openNow !== undefined && <span className={p.openNow ? "font-semibold text-green" : "text-sub"}>{p.openNow ? "Open now" : "Closed now"}</span>}
                    </p>
                    {p.address && <p className="mt-1 line-clamp-2 text-xs text-sub">{p.address}</p>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="ww-press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-green px-3 text-xs font-semibold text-white hover:bg-green-2">
                      Open in Maps <ExternalLink size={13} />
                    </a>
                    {p.phone && (
                      <a href={telHref(p.phone)} className="ww-press pill-glass inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-semibold text-green">
                        <Phone size={13} /> {p.phone}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {platforms.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Book online</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {platforms.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {locals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Local cleaners</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {locals.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* live search for anything not listed */}
      <section className="glass space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <MapPin size={18} className="text-green" /> More on Google Maps
            </h2>
            <p className="mt-0.5 text-sm text-sub">
              {cat ? `${cat.label} cleaners` : "Cleaning services"} {place.mine ? "near your location" : "in Sohna"}, with reviews and phone numbers.
            </p>
          </div>
          {!place.mine && (
            <button onClick={useMine} disabled={locating} className="ww-press pill-glass inline-flex min-h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold text-green">
              <LocateFixed size={14} /> {locating ? "Locating…" : "Use mine"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(cat ? [cat] : CLEANING_CATEGORIES.slice(0, 4)).map((c) => (
            <a
              key={c.id}
              href={mapsSearch(c.search)}
              target="_blank"
              rel="noreferrer"
              className="ww-press inline-flex min-h-10 items-center gap-1.5 rounded-full bg-green px-4 text-sm font-semibold text-white hover:bg-green-2"
            >
              {c.label} near {place.mine ? "me" : "Sohna"} <ExternalLink size={14} />
            </a>
          ))}
        </div>
      </section>

      <p className="px-1 text-xs leading-relaxed text-sub">
        "Top rated" comes live from Google Maps. The other listings and prices were gathered from each provider's own page or public listing on {CHECKED_ON}. WasteWise isn't affiliated with any of them, so confirm prices and that they cover your address before booking.
      </p>
    </div>
  )
}

function ProviderCard({ p }: { p: CleaningProvider }) {
  return (
    <article className="glass flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-bold text-ink">
            {p.name}
            {p.kind === "platform" && <BadgeCheck size={16} className="shrink-0 text-green" aria-label="Online booking platform" />}
          </h3>
          <p className="flex items-center gap-1 text-xs text-sub">
            <MapPin size={12} className="shrink-0" /> {p.area}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {p.categories.slice(0, 3).map((c) => {
            const Icon = ICONS[c]
            return (
              <span key={c} className="grid h-8 w-8 place-items-center rounded-full bg-mint text-green" title={CLEANING_CATEGORIES.find((x) => x.id === c)?.label}>
                <Icon size={15} />
              </span>
            )
          })}
        </div>
      </div>

      {p.prices && (
        <ul className="divide-y divide-green/10 rounded-[14px] bg-mint/50 px-3">
          {p.prices.map((x) => (
            <li key={x.label} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-ink">{x.label}</span>
              <span className="shrink-0 font-bold text-green">from {x.from}</span>
            </li>
          ))}
        </ul>
      )}

      <ul className="flex flex-wrap gap-1.5" aria-label="Services">
        {p.services.map((s) => (
          <li key={s} className="rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-semibold text-sub ring-1 ring-green/10">
            {s}
          </li>
        ))}
      </ul>
      {p.note && <p className="text-xs text-sub">{p.note}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <a href={p.bookUrl} target="_blank" rel="noreferrer" className="ww-press inline-flex min-h-10 items-center gap-1.5 rounded-full bg-green px-4 text-sm font-semibold text-white hover:bg-green-2">
          {p.bookLabel} <ExternalLink size={14} />
        </a>
        {p.phone && (
          <a href={telHref(p.phone)} className="ww-press pill-glass inline-flex min-h-10 items-center gap-1.5 px-4 text-sm font-semibold text-green">
            <Phone size={14} /> {p.phone}
          </a>
        )}
        {p.sourceUrl !== p.bookUrl && (
          <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sub underline underline-offset-2">
            Source
          </a>
        )}
      </div>
    </article>
  )
}

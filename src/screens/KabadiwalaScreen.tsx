// Kabadiwala: sell sellable scrap to dealers nearby instead of binning it.
// Opened from a scan result (filter preset to what was scanned) or from Home.

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Clock, ExternalLink, LocateFixed, MapPin, Navigation, Phone, RefreshCw, Search } from "lucide-react"
import { HOME_AREA } from "@/components/earth-globe"
import { DealerMap } from "@/components/dealer-map"
import { Button } from "@/components/ui/button"
import { currentLocation } from "@/lib/location"
import { SCRAP_KINDS, scrapLabel, type ScrapKind } from "@/lib/scrap"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"

interface Dealer {
  id: string
  name: string
  source: "places" | "google" | "osm"
  buys: ScrapKind[]
  lat?: number
  lng?: number
  distanceKm?: number
  address?: string
  phone?: string
  hours?: string
  rating?: number
  reviews?: number
  openNow?: boolean
  mapsUrl: string
}

interface DealerResponse {
  dealers: Dealer[]
  sources: { places?: string; google: string; osm: string }
  searchLinks: { kind: ScrapKind | "all"; label: string; url: string }[]
}

type Place = { lat: number; lng: number; mine: boolean }

const searchUrl = (q: string, p: Place) => `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${p.lat},${p.lng},14z`
const SEARCH: Record<ScrapKind | "all", string> = {
  all: "kabadiwala",
  metal: "scrap metal dealer",
  paper: "raddi wala",
  plastic: "plastic scrap buyer",
  ewaste: "e-waste collection centre",
}

export function KabadiwalaScreen({ kinds: initialKinds = [], from }: { kinds?: ScrapKind[]; from?: string }) {
  const { navigate } = useApp()
  const [kinds, setKinds] = useState<ScrapKind[]>(initialKinds)
  const [place, setPlace] = useState<Place | null>(null)
  const [locating, setLocating] = useState(true)
  const [data, setData] = useState<DealerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  const locate = useCallback(async () => {
    setLocating(true)
    const here = await currentLocation()
    setPlace(here ? { ...here, mine: true } : { ...HOME_AREA, mine: false })
    setLocating(false)
  }, [])

  useEffect(() => {
    locate()
  }, [locate])

  const load = useCallback(async (p: Place) => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch("/api/scrap-dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: p.lat, lng: p.lng }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setData(await res.json())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (place) load(place)
  }, [place, load])

  const toggle = (k: ScrapKind) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))

  // general kabadiwalas (no specific tags) count for every filter
  const shown = useMemo(
    () => (data?.dealers ?? []).filter((d) => !kinds.length || !d.buys.length || d.buys.some((b) => kinds.includes(b))),
    [data, kinds]
  )
  const mapped = useMemo(() => shown.filter((d): d is Dealer & { lat: number; lng: number } => typeof d.lat === "number" && typeof d.lng === "number"), [shown])
  const onPick = useCallback((id: string) => {
    setPicked(id)
    document.getElementById(`dealer-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  const searchKinds: (ScrapKind | "all")[] = ["all", ...(kinds.length ? kinds : [])]

  return (
    <div className="space-y-4 px-4 pt-4 pb-32 lg:mx-auto lg:max-w-[960px] lg:pt-8 lg:pb-16">
      <header className="flex items-start gap-2">
        {from && (
          <Button variant="secondary" size="icon" aria-label="Back" onClick={() => window.history.back()}>
            <ArrowLeft size={22} />
          </Button>
        )}
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">Sell your scrap</p>
          <h1 className="display text-3xl lg:text-[40px]">Kabadiwala</h1>
          <p className="mt-0.5 text-sm text-sub">Scrap dealers near you who buy what you'd otherwise bin.</p>
        </div>
      </header>

      {from && (
        <div className="tile flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-sm">
          <span className="text-sub">From your scan:</span>
          <span className="font-semibold capitalize text-ink">{from}</span>
          <span className="text-sub">→</span>
          {initialKinds.map((k) => (
            <span key={k} className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-green">
              {scrapLabel(k)}
            </span>
          ))}
        </div>
      )}

      {/* filter */}
      <div role="group" aria-label="What are you selling?" className="no-scrollbar flex gap-2 overflow-x-auto">
        <button
          onClick={() => setKinds([])}
          aria-pressed={!kinds.length}
          className={cn("ww-press min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold", !kinds.length ? "pill" : "pill-glass text-green")}
        >
          All scrap
        </button>
        {SCRAP_KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => toggle(k.id)}
            aria-pressed={kinds.includes(k.id)}
            className={cn("ww-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold", kinds.includes(k.id) ? "pill" : "pill-glass text-green")}
          >
            <span aria-hidden>{k.emoji}</span> {k.label}
          </button>
        ))}
      </div>

      {/* where */}
      <div className="glass flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-green">
          <MapPin size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{locating ? "Finding your location…" : place?.mine ? "Near your location" : "Around Sohna"}</p>
          <p className="text-xs text-sub">
            {locating ? "Allow location so we can look nearby." : place?.mine ? "Rounded to about 100 m." : "Location was blocked or unavailable, so this shows Sohna."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={locate} disabled={locating}>
          <LocateFixed size={16} /> {place?.mine ? "Refresh" : "Use mine"}
        </Button>
      </div>

      {/* always available: Google Maps search for this area */}
      {place && (
        <div className="glass p-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <Search size={18} className="text-green" /> Search Google Maps
          </h2>
          <p className="mt-0.5 text-sm text-sub">Most local kabadiwalas are listed there, with reviews and phone numbers.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {searchKinds.map((k) => (
              <a
                key={k}
                href={searchUrl(SEARCH[k], place)}
                target="_blank"
                rel="noreferrer"
                className="ww-press inline-flex min-h-10 items-center gap-1.5 rounded-full bg-green px-4 text-sm font-semibold text-white hover:bg-green-2"
              >
                {k === "all" ? "Kabadiwalas near me" : `${SCRAP_KINDS.find((s) => s.id === k)!.buyer.replace(/^\w/, (c) => c.toUpperCase())}`}
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* dealers found by Google grounding / OpenStreetMap */}
      <section className="glass space-y-3 p-4" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-ink">Dealers nearby</h2>
          {data && !loading && (
            <button onClick={() => place && load(place)} className="ww-press inline-flex items-center gap-1 text-xs font-semibold text-green" aria-label="Search again">
              <RefreshCw size={13} /> Search again
            </button>
          )}
        </div>

        {(locating || loading) && (
          <p className="tile px-4 py-3 text-sm text-sub">Looking for mapped scrap dealers nearby… this can take up to 20 seconds.</p>
        )}
        {failed && !loading && <p className="tile px-4 py-3 text-sm text-ink">Couldn't search right now. Use the Google Maps buttons above.</p>}

        {data && !loading && (
          <>
            {mapped.length > 0 && place && <DealerMap center={place} dealers={mapped} onPick={onPick} />}
            {shown.length > 0 ? (
              <ul className="space-y-2">
                {shown.map((d) => (
                  <DealerCard key={d.id} d={d} picked={picked === d.id} />
                ))}
              </ul>
            ) : (
              <div className="tile space-y-1 px-4 py-3 text-sm text-ink">
                <p className="font-semibold">No {kinds.length ? kinds.map(scrapLabel).join(" / ").toLowerCase() + " " : ""}dealers are mapped near here yet.</p>
                <p className="text-sub">
                  {data.sources.places === "no_key"
                    ? "Google listings need GOOGLE_PLACES_API_KEY on the server. "
                    : data.sources.places === "error"
                      ? "Google listings didn't load (check the Places API is enabled for the key). "
                      : ""}
                  {data.sources.osm === "error" ? "OpenStreetMap didn't respond. " : data.sources.osm === "none" ? "OpenStreetMap has none tagged within 10 km. " : ""}
                  Use the Google Maps buttons above to find kabadiwalas.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <div className="glass p-4 text-sm">
        <h2 className="font-bold text-ink">Before you sell</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sub">
          <li>Keep metal, paper, plastic and e-waste in separate bags; mixed scrap sells for less.</li>
          <li>Keep paper dry and flatten cardboard.</li>
          <li>Ask the rate per kg before weighing, and watch the scale.</li>
          <li>Batteries and electronics: ask if they pass them to an authorised e-waste recycler.</li>
        </ul>
      </div>

      <button onClick={() => navigate({ name: "scan" })} className="ww-press glass flex w-full items-center justify-center gap-2 p-4 text-sm font-semibold text-green">
        Scan another item
      </button>
    </div>
  )
}

function DealerCard({ d, picked }: { d: Dealer; picked: boolean }) {
  return (
    <li id={`dealer-${d.id}`} className={cn("tile scroll-mt-24 space-y-2 px-4 py-3 transition-shadow", picked && "ring-2 ring-green")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{d.name}</p>
          <p className="text-xs text-sub">
            {d.distanceKm !== undefined && <>{d.distanceKm} km away · </>}
            {d.source === "osm" ? "OpenStreetMap" : "Google Maps"}
          </p>
          {(d.rating !== undefined || d.openNow !== undefined) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
              {d.rating !== undefined && (
                <span className="font-semibold text-ink">
                  ★ {d.rating.toFixed(1)} <span className="font-normal text-sub">({d.reviews ?? 0})</span>
                </span>
              )}
              {d.openNow !== undefined && <span className={d.openNow ? "font-semibold text-green" : "text-sub"}>{d.openNow ? "Open now" : "Closed now"}</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {d.buys.length ? (
            d.buys.map((b) => (
              <span key={b} className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-green">
                {scrapLabel(b)}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-green">Most scrap</span>
          )}
        </div>
      </div>
      {(d.address || d.hours) && (
        <div className="space-y-0.5 text-xs text-sub">
          {d.address && (
            <p className="flex items-center gap-1">
              <MapPin size={12} /> {d.address}
            </p>
          )}
          {d.hours && (
            <p className="flex items-center gap-1">
              <Clock size={12} /> {d.hours}
            </p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <a href={d.mapsUrl} target="_blank" rel="noreferrer" className="ww-press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-green px-3 text-xs font-semibold text-white">
          <Navigation size={13} /> {d.source === "osm" ? "Directions" : "Open in Maps"}
        </a>
        {d.phone && (
          <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="ww-press pill-glass inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-semibold text-green">
            <Phone size={13} /> Call
          </a>
        )}
      </div>
    </li>
  )
}

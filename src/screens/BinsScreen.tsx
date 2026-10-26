// Bin map: every bin on a Google map, coloured by type, and a list sorted by
// distance from you. Opened from a scan result to find the nearest bin of that colour.

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, LocateFixed, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HOME_AREA } from "@/components/earth-globe"
import { BINS, distanceM, distanceText } from "@/data/bins"
import { binTone } from "@/lib/binColors"
import { CATEGORIES } from "@/lib/categories"
import { MAP_ID, pinElement, useGoogleMaps } from "@/lib/googleMaps"
import { currentLocation, type LatLng } from "@/lib/location"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"

const label = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id
const binName = (id: string) => CATEGORIES.find((c) => c.id === id)?.bin ?? ""

export function BinsScreen({ category }: { category?: string }) {
  const { navigate } = useApp()
  const [filter, setFilter] = useState<string | null>(category ?? null)
  const [me, setMe] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  const locate = async () => {
    setLocating(true)
    setMe(await currentLocation())
    setLocating(false)
  }
  useEffect(() => {
    locate()
  }, [])

  // far from the mapped area (or no location): measure from the area itself
  const from = me && distanceM(me, HOME_AREA) < 3000 ? me : HOME_AREA
  const list = useMemo(
    () =>
      BINS.filter((b) => !filter || b.category === filter)
        .map((b) => ({ ...b, m: distanceM(from, b) }))
        .sort((a, b) => a.m - b.m),
    [filter, from.lat, from.lng]
  )
  const nearest = list[0]

  return (
    <div className="space-y-4 px-4 pt-4 pb-32 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0 lg:pt-8 lg:pb-16">
      <header className="flex items-center gap-3 lg:col-span-12">
        <Button variant="secondary" size="icon" aria-label="Back" onClick={() => window.history.back()}>
          <ArrowLeft size={22} />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.14em] text-green uppercase">Bins near you</p>
          <h1 className="display text-3xl lg:text-[40px]">{nearest && filter ? `Nearest ${binName(filter).toLowerCase()}` : "Find a bin"}</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={locate} disabled={locating}>
          <LocateFixed size={16} /> {locating ? "Finding you…" : "My location"}
        </Button>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto lg:col-span-12" role="radiogroup" aria-label="Bin type">
        {[null, ...CATEGORIES.map((c) => c.id)].map((id) => {
          const on = filter === id
          const tone = id ? binTone(id) : null
          return (
            <button
              key={id ?? "all"}
              role="radio"
              aria-checked={on}
              onClick={() => setFilter(id)}
              className={cn("ww-press inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold", on ? "pill" : "pill-glass")}
            >
              {tone && <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.vivid }} />}
              {id ? label(id) : "All bins"}
            </button>
          )
        })}
      </div>

      <div className="lg:col-span-7">
        <BinMap center={from} you={me && from === me ? me : null} bins={list} picked={picked} onPick={setPicked} />
        <p className="mt-2 text-[11px] text-sub">Sample bin positions. {me && from !== me && "You're outside the mapped area, so distances are from Sohna."}</p>
      </div>

      <ul className="space-y-2 lg:col-span-5">
        {list.map((b, i) => {
          const tone = binTone(b.category)
          return (
            <li key={b.id} className={cn("tile flex items-center gap-2 pr-2", picked === b.id && "ring-2 ring-green")}>
              <button onClick={() => setPicked(b.id)} className="ww-press flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: tone.deep }}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{b.name}</span>
                  <span className="block text-xs" style={{ color: tone.text }}>
                    {binName(b.category)} · {label(b.category)}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums">{distanceText(b.m)}</span>
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Walking directions to ${b.name}`}
                className="ww-press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-green shadow-soft"
              >
                <Navigation size={15} />
              </a>
            </li>
          )
        })}
      </ul>
      {!list.length && <p className="tile px-4 py-6 text-center text-sm text-sub lg:col-span-12">No bins of this type are mapped yet.</p>}
    </div>
  )
}

function BinMap({
  center,
  you,
  bins,
  picked,
  onPick,
}: {
  center: LatLng
  you: LatLng | null
  bins: { id: string; category: string; name: string; lat: number; lng: number }[]
  picked: string | null
  onPick: (id: string) => void
}) {
  const status = useGoogleMaps()
  const [theme] = useTheme()
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([])

  useEffect(() => {
    if (status !== "ready" || !box.current) return
    map.current = new google.maps.Map(box.current, {
      center,
      zoom: 17,
      mapId: MAP_ID,
      colorScheme: theme === "dark" ? google.maps.ColorScheme.DARK : google.maps.ColorScheme.LIGHT,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    })
    return () => {
      markers.current.forEach((m) => (m.map = null))
      markers.current = []
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, theme])

  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((mk) => (mk.map = null))
    const pins = bins.map((b) => {
      const tone = binTone(b.category)
      const size = picked === b.id ? 30 : 22
      const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${tone.vivid};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.3);cursor:pointer"></div>`
      const mk = new google.maps.marker.AdvancedMarkerElement({
        map: m,
        position: { lat: b.lat, lng: b.lng },
        content: pinElement(html, b.name),
        title: b.name,
        gmpClickable: true,
      })
      mk.addListener("gmp-click", () => onPick(b.id))
      return mk
    })
    if (you) {
      const dot = '<div style="width:18px;height:18px;border-radius:9999px;background:#2F80FF;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>'
      pins.push(new google.maps.marker.AdvancedMarkerElement({ map: m, position: you, content: pinElement(dot, "You"), title: "You" }))
    }
    markers.current = pins
    const focus = bins.find((b) => b.id === picked)
    if (focus) m.panTo(focus)
    else if (bins.length) {
      const bounds = new google.maps.LatLngBounds()
      bins.slice(0, 6).forEach((b) => bounds.extend(b))
      if (you) bounds.extend(you)
      m.fitBounds(bounds, 48)
      google.maps.event.addListenerOnce(m, "idle", () => {
        if ((m.getZoom() ?? 0) > 18) m.setZoom(18)
      })
    }
  }, [bins, you, picked, onPick, status, theme])

  if (status === "error") {
    return (
      <p className="tile px-4 py-3 text-sm text-sub">The map needs a Google Maps key (VITE_GOOGLE_MAPS_API_KEY) that allows this site. The list still works.</p>
    )
  }
  return (
    <div className="relative isolate h-72 w-full overflow-hidden rounded-[20px] bg-page shadow-soft lg:h-[460px]">
      <div ref={box} className="h-full w-full" />
      {status === "loading" && <p className="absolute inset-0 grid place-items-center text-sm text-sub">Loading map…</p>}
    </div>
  )
}

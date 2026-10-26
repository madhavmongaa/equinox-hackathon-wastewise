import { useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { EarthGlobe } from "@/components/earth-globe"
import type { GlobeFocus, GlobeMarker } from "@/components/ui/3d-globe"
import { Switch } from "@/components/ui/switch"
import { binTone } from "@/lib/binColors"
import { useRecordLocation } from "@/lib/location"
import { useApp } from "@/state/AppContext"

/** Profile: a globe with a pin wherever you saved a scan (opt-in), coloured by bin. */
export function ScanFootprint() {
  const { history, navigate, toast } = useApp()
  const rec = useRecordLocation()
  const located = useMemo(() => history.filter((h) => h.location), [history])
  const markers = useMemo<GlobeMarker[]>(
    () =>
      located.map((h) => ({
        lat: h.location!.lat,
        lng: h.location!.lng,
        color: binTone(h.category_id).vivid,
        size: 9,
        label: h.corrected_item ?? h.ai_item,
        id: h.id,
      })),
    [located]
  )
  // start turned towards the latest scan, then leave the globe to the user
  const [focus, setFocus] = useState<GlobeFocus | null>(() => (located[0] ? { ...located[0].location!, distance: 3.2 } : null))
  const [hovered, setHovered] = useState<string | null>(null)
  const places = new Set(located.map((h) => `${h.location!.lat.toFixed(2)},${h.location!.lng.toFixed(2)}`)).size

  const toggle = async (on: boolean) => {
    const ok = await rec.set(on)
    if (!ok) toast("Location is blocked or unavailable. Allow it in your browser to record where you scan.", "error")
    else if (on) toast("Your next saved scans will be pinned on your footprint", "happy")
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-lg">My footprint</h2>
          <p className="text-sm text-sub" aria-live="polite">
            {hovered ??
              (located.length
                ? `${located.length} ${located.length === 1 ? "scan" : "scans"} in ${places} ${places === 1 ? "place" : "places"} · tap a pin`
                : "Pins show where you sorted each item.")}
          </p>
        </div>
        <MapPin size={20} className="mt-1 shrink-0 text-green" aria-hidden />
      </div>

      {located.length > 0 ? (
        <div className="mint-glow mx-auto mt-2 w-full max-w-[320px] rounded-full">
          <EarthGlobe
            className="h-[260px]"
            still
            showHome={false}
            markers={markers}
            label={`Globe with ${located.length} places where you sorted items`}
            focus={focus}
            onFocusArrive={() => setFocus(null)}
            onMarkerHover={(m) => setHovered(m?.label ?? null)}
            onMarkerClick={(m) => m.id && navigate({ name: "historyDetail", id: m.id })}
          />
        </div>
      ) : (
        <p className="tile mt-3 px-4 py-3 text-sm text-ink">
          {rec.enabled ? "Location is on. Save a scan and it'll appear here as a pin." : "Turn on location below, then save a scan to drop your first pin."}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-green/10 pt-3">
        <div>
          <p className="text-sm font-semibold">Record where I scan</p>
          <p className="text-xs text-sub">Rounded to about 100 m and kept on this device only.</p>
        </div>
        <Switch label="Record where I scan" checked={rec.enabled} onChange={(v) => !rec.asking && toggle(v)} />
      </div>
    </div>
  )
}

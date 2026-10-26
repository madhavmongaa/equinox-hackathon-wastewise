import { useMemo } from "react"
import { Globe3D, type Globe3DConfig, type GlobeFocus, type GlobeMarker } from "@/components/ui/3d-globe"
import { cn, prefersReducedMotion } from "@/lib/utils"

/** Where WasteWise started (Sohna, Haryana — approximate). Maps fall back to here without your location. */
export const HOME_AREA = { lat: 28.25, lng: 77.07 }
const homeMarker: GlobeMarker = { ...HOME_AREA, src: "/favicon.svg", label: "Sohna", id: "home" }

// Same look as the Aceternity 3d-globe demo; no auto-rotation with reduced motion.
const baseConfig: Globe3DConfig = {
  atmosphereColor: "#4da6ff",
  atmosphereIntensity: 20,
  bumpScale: 5,
  autoRotateSpeed: prefersReducedMotion() ? 0 : 0.3,
  initialRotation: { x: 0, y: 0 },
  // a little brighter than the demo, which is tuned for dark pages
  ambientIntensity: 1.4,
  pointLightIntensity: 2.2,
}

interface Props {
  className?: string
  /** pins besides the home pin (dumps, scans…) */
  markers?: GlobeMarker[]
  showHome?: boolean
  label?: string
  onMarkerClick?: (marker: GlobeMarker) => void
  onMarkerHover?: (marker: GlobeMarker | null) => void
  focus?: GlobeFocus | null
  onFocusArrive?: () => void
  /** allow the camera close to the surface (for flying in) */
  closeUp?: boolean
  /** no auto-rotation */
  still?: boolean
}

export function EarthGlobe({ className, markers = [], showHome = true, label, onMarkerClick, onMarkerHover, focus, onFocusArrive, closeUp, still }: Props) {
  const all = useMemo(() => (showHome ? [homeMarker, ...markers] : markers), [showHome, markers])
  const config = useMemo<Globe3DConfig>(
    () => ({ ...baseConfig, ...(closeUp ? { minDistance: 2.3 } : null), ...(still ? { autoRotateSpeed: 0 } : null) }),
    [closeUp, still]
  )
  return (
    <div role="img" aria-label={label ?? "Rotating 3D globe"} className={cn("w-full", className)}>
      <Globe3D markers={all} config={config} className="h-full" onMarkerClick={onMarkerClick} onMarkerHover={onMarkerHover} focus={focus} onFocusArrive={onFocusArrive} />
    </div>
  )
}

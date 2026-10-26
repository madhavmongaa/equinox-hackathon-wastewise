// Kabadiwala finder: scrap dealers near a location.
// 1. Google Places API (real listings with ratings and phone numbers; needs GOOGLE_PLACES_API_KEY)
// 2. If Places has little: Google Maps grounding through Gemini, and OpenStreetMap via Overpass
// 3. Always: Google Maps search links for the area, so there's somewhere to go even when nothing is found.
// Nothing is made up: every dealer comes from one of those sources.

import type { GoogleGenAI } from "@google/genai"
import type { Express } from "express"
import { placesAvailable, searchPlaces } from "./places"

type Kind = "metal" | "paper" | "plastic" | "ewaste"
const KINDS: Kind[] = ["metal", "paper", "plastic", "ewaste"]

export interface ScrapDealer {
  id: string
  name: string
  source: "places" | "google" | "osm"
  /** what they buy; empty = general kabadiwala (buys most scrap) */
  buys: Kind[]
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

const SEARCH_TERMS: Record<Kind | "all", string> = {
  all: "kabadiwala",
  metal: "scrap metal dealer",
  paper: "raddi wala",
  plastic: "plastic scrap buyer",
  ewaste: "e-waste collection centre",
}

const searchUrl = (q: string, lat: number, lng: number) => `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${lat},${lng},14z`

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ---------- Google Places ----------

async function fromPlaces(lat: number, lng: number): Promise<{ dealers: ScrapDealer[]; status: string }> {
  if (!placesAvailable()) return { dealers: [], status: "no_key" }
  try {
    const found = await searchPlaces("scrap-all", lat, lng)
    const dealers: ScrapDealer[] = found.map((p) => ({
      id: `places-${p.id}`,
      name: p.name,
      source: "places",
      buys: [], // listings don't say what they buy; kabadiwalas usually take most scrap
      lat: p.lat,
      lng: p.lng,
      distanceKm: p.distanceKm,
      address: p.address,
      phone: p.phone,
      rating: p.rating,
      reviews: p.reviews,
      openNow: p.openNow,
      mapsUrl: p.mapsUrl,
    }))
    return { dealers, status: dealers.length ? "ok" : "none" }
  } catch (err) {
    console.warn("[scrap] Places search failed:", (err as Error).message)
    return { dealers: [], status: "error" }
  }
}

// ---------- Google Maps grounding ----------

async function fromGoogle(ai: GoogleGenAI, lat: number, lng: number): Promise<{ dealers: ScrapDealer[]; status: string }> {
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents:
          "List kabadiwalas (scrap dealers), scrap metal buyers, raddi shops and e-waste collectors near this location, with what each one buys.",
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } },
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunks: any[] = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
    const dealers = chunks
      .filter((c) => c.maps?.uri)
      .map((c, i) => ({
        id: `g-${c.maps.placeId ?? i}`,
        name: c.maps.title || "Scrap dealer",
        source: "google" as const,
        buys: [],
        mapsUrl: c.maps.uri,
      }))
    return { dealers, status: dealers.length ? "ok" : "none" }
  } catch (err) {
    const e = err as { status?: number; message?: string }
    const status = e.status === 429 || /429|quota/i.test(e.message ?? "") ? "no_quota" : "error"
    console.warn("[scrap] Google Maps grounding unavailable:", status)
    return { dealers: [], status }
  }
}

// ---------- OpenStreetMap ----------

const OSM_KIND_TAGS: Record<Kind, string[]> = {
  metal: ["recycling:scrap_metal", "recycling:metal", "recycling:cans", "recycling:aluminium"],
  paper: ["recycling:paper", "recycling:cardboard", "recycling:newspaper", "recycling:magazines", "recycling:books"],
  plastic: ["recycling:plastic", "recycling:plastic_bottles", "recycling:plastic_packaging", "recycling:pet_drink_bottles"],
  ewaste: ["recycling:electrical_items", "recycling:small_appliances", "recycling:batteries", "recycling:computers", "recycling:mobile_phones"],
}

function osmBuys(tags: Record<string, string>): Kind[] {
  const buys = KINDS.filter((k) => OSM_KIND_TAGS[k].some((t) => tags[t] === "yes"))
  if (!buys.length && (tags.shop === "scrap_yard" || tags.industrial === "scrap_yard")) return ["metal"]
  return buys
}

async function fromOsm(lat: number, lng: number, radiusM: number): Promise<{ dealers: ScrapDealer[]; status: string }> {
  const around = `(around:${radiusM},${lat},${lng})`
  // tag searches are cheap; the name search is limited to points, which keeps dense cities under ~15 s
  const query = `[out:json][timeout:20];(
    nwr${around}["shop"="scrap_yard"];
    nwr${around}["industrial"="scrap_yard"];
    nwr${around}["amenity"="recycling"]["recycling_type"="centre"];
    node${around}["shop"]["name"~"kabad|kabaad|kabari|kabbadi|kabadi|raddi|scrap",i];
  );out center tags 60;`
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "WasteWise app" },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) throw new Error(`overpass ${res.status}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as { elements: any[] }
    const dealers: ScrapDealer[] = json.elements
      .map((el) => {
        const t: Record<string, string> = el.tags ?? {}
        const pLat = el.lat ?? el.center?.lat
        const pLng = el.lon ?? el.center?.lon
        if (typeof pLat !== "number" || typeof pLng !== "number") return null
        const street = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] ?? t["addr:city"]].filter(Boolean).join(", ")
        return {
          id: `osm-${el.type}-${el.id}`,
          name: t.name || t["name:en"] || (t.amenity === "recycling" ? "Recycling centre" : "Scrap dealer"),
          source: "osm" as const,
          buys: osmBuys(t),
          lat: pLat,
          lng: pLng,
          distanceKm: Math.round(distanceKm(lat, lng, pLat, pLng) * 10) / 10,
          address: street || undefined,
          phone: t.phone || t["contact:phone"] || undefined,
          hours: t.opening_hours || undefined,
          mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}`,
        }
      })
      .filter((d): d is NonNullable<typeof d> => !!d)
      .sort((a, b) => a.distanceKm - b.distanceKm)
    return { dealers, status: dealers.length ? "ok" : "none" }
  } catch (err) {
    console.warn("[scrap] OpenStreetMap lookup failed:", (err as Error).message)
    return { dealers: [], status: "error" }
  }
}

// ---------- route ----------

const cache = new Map<string, { at: number; body: unknown }>()
const CACHE_MS = 10 * 60 * 1000

export function registerScrapRoutes(app: Express, ai: GoogleGenAI | null) {
  app.post("/api/scrap-dealers", async (req, res) => {
    const { lat, lng } = req.body ?? {}
    if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: "Valid lat and lng are required" })
    }
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_MS) return res.json(hit.body)

    const places = await fromPlaces(lat, lng)
    // Places is fast and thorough; only fall back to the slower sources when it has little
    const enough = places.dealers.length >= 3
    const [google, osm] = enough
      ? [{ dealers: [], status: "skipped" }, { dealers: [], status: "skipped" }]
      : await Promise.all([
          ai ? fromGoogle(ai, lat, lng) : Promise.resolve({ dealers: [], status: "no_key" }),
          fromOsm(lat, lng, 10000),
        ])

    const body = {
      dealers: [...places.dealers, ...google.dealers, ...osm.dealers],
      sources: { places: places.status, google: google.status, osm: osm.status },
      searchLinks: (["all", ...KINDS] as const).map((k) => ({ kind: k, label: SEARCH_TERMS[k], url: searchUrl(SEARCH_TERMS[k], lat, lng) })),
    }
    // only cache answers that came back cleanly
    if (osm.status !== "error") cache.set(key, { at: Date.now(), body })
    res.json(body)
  })
}

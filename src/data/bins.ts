// Public bins and drop points. SAMPLE POSITIONS around Sohna (the app's home area);
// replace with real locations (a phone's map pin is accurate enough).
// category matches the bin ids in src/data/binCategories.json.

export interface MapBin {
  id: string
  category: string
  name: string
  lat: number
  lng: number
}

export const BINS: MapBin[] = [
  { id: "b1", category: "dry", name: "Sohna Chowk", lat: 28.2508, lng: 77.0688 },
  { id: "b2", category: "wet", name: "Sohna Chowk", lat: 28.2509, lng: 77.0689 },
  { id: "b3", category: "dry", name: "Sector 4 market", lat: 28.2502, lng: 77.0705 },
  { id: "b4", category: "wet", name: "Sabzi mandi gate", lat: 28.2494, lng: 77.0712 },
  { id: "b5", category: "dry", name: "Sabzi mandi gate", lat: 28.2493, lng: 77.0713 },
  { id: "b6", category: "reject", name: "Bus stand public toilets", lat: 28.2491, lng: 77.0716 },
  { id: "b7", category: "ewaste", name: "E-waste drop box, civic centre", lat: 28.2512, lng: 77.0717 },
  { id: "b8", category: "hazardous", name: "Civil hospital (red bin)", lat: 28.2517, lng: 77.0702 },
  { id: "b9", category: "dry", name: "Main road, near the park", lat: 28.2482, lng: 77.0686 },
  { id: "b10", category: "wet", name: "Main road, near the park", lat: 28.2481, lng: 77.0687 },
  { id: "b11", category: "dry", name: "Residential block B", lat: 28.2488, lng: 77.0731 },
  { id: "b12", category: "wet", name: "Residential block B", lat: 28.2487, lng: 77.0732 },
  { id: "b13", category: "reject", name: "Sports stadium", lat: 28.2524, lng: 77.0726 },
  { id: "b14", category: "dry", name: "Sports stadium", lat: 28.2525, lng: 77.0725 },
]

/** Metres between two points (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const distanceText = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)

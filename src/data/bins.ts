// Where the campus bins are. SAMPLE POSITIONS around the campus point used by the globe;
// replace with the real bin locations (a phone's map pin is accurate enough).
// category matches the waste guide's bin ids (dry, wet, hazardous, reject, ewaste).

export interface CampusBin {
  id: string
  category: string
  name: string
  lat: number
  lng: number
}

export const BINS: CampusBin[] = [
  { id: "b1", category: "dry", name: "Main gate", lat: 28.2508, lng: 77.0688 },
  { id: "b2", category: "wet", name: "Main gate", lat: 28.2509, lng: 77.0689 },
  { id: "b3", category: "dry", name: "Academic block, ground floor", lat: 28.2502, lng: 77.0705 },
  { id: "b4", category: "wet", name: "Food court", lat: 28.2494, lng: 77.0712 },
  { id: "b5", category: "dry", name: "Food court", lat: 28.2493, lng: 77.0713 },
  { id: "b6", category: "reject", name: "Food court washrooms", lat: 28.2491, lng: 77.0716 },
  { id: "b7", category: "ewaste", name: "Library entrance (e-waste box)", lat: 28.2512, lng: 77.0717 },
  { id: "b8", category: "hazardous", name: "Science labs (red bin)", lat: 28.2517, lng: 77.0702 },
  { id: "b9", category: "dry", name: "Boys Hostel 1 bin bay", lat: 28.2482, lng: 77.0686 },
  { id: "b10", category: "wet", name: "Boys Hostel 1 bin bay", lat: 28.2481, lng: 77.0687 },
  { id: "b11", category: "dry", name: "Girls Hostel, Block B", lat: 28.2488, lng: 77.0731 },
  { id: "b12", category: "wet", name: "Girls Hostel, Block B", lat: 28.2487, lng: 77.0732 },
  { id: "b13", category: "reject", name: "Sports complex", lat: 28.2524, lng: 77.0726 },
  { id: "b14", category: "dry", name: "Sports complex", lat: 28.2525, lng: 77.0725 },
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

import { useEffect, useState } from "react"
import type { HistoryEntry } from "@/lib/types"

// High-fidelity SVG thumbnails for mock scan items
const BOTTLE_THUMB = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="16" fill="%23EBF3FE"/><path d="M28 14h8v5h-8z" fill="%232F6FD6"/><rect x="25" y="19" width="14" height="31" rx="4" fill="%2393C5FD"/><path d="M27 26h10M27 32h10M27 38h10" stroke="%232563EB" stroke-width="1.8" stroke-linecap="round"/><circle cx="32" cy="32" r="3" fill="%231D4ED8"/></svg>`

const PIZZA_THUMB = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="16" fill="%23EDF8EE"/><path d="M16 26l16-8 16 8-16 8-16-8z" fill="%23D97706"/><path d="M16 26v14l16 8 16-8V26l-16 8-16-8z" fill="%23B45309"/><path d="M28 32c1 2 4 3 6 1s1-4-2-4" stroke="%233C9A4E" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="31" r="2" fill="%2315803D"/></svg>`

const AEROSOL_THUMB = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="16" fill="%23FEECEB"/><rect x="24" y="22" width="16" height="28" rx="4" fill="%23EF4444"/><rect x="28" y="15" width="8" height="7" rx="2" fill="%23B91C1C"/><circle cx="32" cy="18" r="1.5" fill="%23FFFFFF"/><path d="M28 34h8M28 40h8" stroke="%23FFFFFF" stroke-width="1.5" stroke-linecap="round"/><path d="M38 16l4-2M39 19l4 1" stroke="%23DC2626" stroke-width="1.5" stroke-linecap="round"/></svg>`

export const DEFAULT_MOCK_SCANS: HistoryEntry[] = [
  {
    id: "mock-scan-bottle-1",
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 min ago
    input_type: "photo",
    thumbnail: BOTTLE_THUMB,
    description: "Clear plastic drinking bottle with blue screw cap",
    clarifications: [],
    ai_item: "Plastic Water Bottle",
    ai_material: "PET Plastic (#1)",
    confidence: "high",
    corrected_item: null,
    rule_id: "1.1",
    category_id: "dry",
    rule_found: true,
    rule_snapshot: {
      rule_id: "1.1",
      source_text: "Plastic bottles (PET, HDPE): empty, rinse lightly, flatten and place with lid attached into the blue bin.",
      preparation: ["Empty liquids completely", "Rinse lightly", "Crush to save space", "Reattach cap"],
      category_label: "Dry Waste",
      bin: "Blue bin",
    },
    points_awarded: 15,
  },
  {
    id: "mock-scan-pizza-2",
    timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(), // ~1 hr ago
    input_type: "photo",
    thumbnail: PIZZA_THUMB,
    description: "Cardboard pizza takeout box with cheese and oil stains",
    clarifications: [],
    ai_item: "Greasy Pizza Box",
    ai_material: "Food-soiled Cardboard",
    confidence: "high",
    corrected_item: null,
    rule_id: "2.3",
    category_id: "wet",
    rule_found: true,
    rule_snapshot: {
      rule_id: "2.3",
      source_text: "Food-contaminated paper and cardboard (pizza boxes, napkins) belong in the green Wet Waste bin for composting.",
      preparation: ["Remove any plastic dipping cups or foil liners", "Tear box into quarters if large"],
      category_label: "Wet Waste",
      bin: "Green bin",
    },
    points_awarded: 10,
  },
  {
    id: "mock-scan-aerosol-3",
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(), // ~3 hrs ago
    input_type: "photo",
    thumbnail: AEROSOL_THUMB,
    description: "Empty deodorant aerosol spray can",
    clarifications: [],
    ai_item: "Aerosol Spray Can",
    ai_material: "Pressurized Metal Can",
    confidence: "high",
    corrected_item: null,
    rule_id: "3.2",
    category_id: "hazardous",
    rule_found: true,
    rule_snapshot: {
      rule_id: "3.2",
      source_text: "Aerosol containers must be fully discharged and placed in the red Hazardous Waste bin. Do not crush or puncture.",
      preparation: ["Ensure canister is completely discharged", "Never puncture, incinerate or crush"],
      category_label: "Hazardous Waste",
      bin: "Red bin",
    },
    points_awarded: 20,
  },
]

class MockScanStore {
  private scans: HistoryEntry[] = [...DEFAULT_MOCK_SCANS]
  private listeners = new Set<(scans: HistoryEntry[]) => void>()

  getRecentScans(limit = 3): HistoryEntry[] {
    return this.scans.slice(0, limit)
  }

  getScanById(id: string): HistoryEntry | undefined {
    return this.scans.find((s) => s.id === id)
  }

  addScan(entry: HistoryEntry) {
    this.scans = [entry, ...this.scans.filter((s) => s.id !== entry.id)]
    this.notify()
  }

  subscribe(listener: (scans: HistoryEntry[]) => void): () => void {
    this.listeners.add(listener)
    listener(this.getRecentScans())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const data = this.getRecentScans()
    this.listeners.forEach((l) => l(data))
  }
}

export const mockScanStore = new MockScanStore()

/**
 * Returns the last 3 scanned items using the mock state store,
 * combined with any live user scans to always provide a populated, realistic list.
 */
export function useMockRecentScans(userHistory: HistoryEntry[] = []): HistoryEntry[] {
  const [mockScans, setMockScans] = useState<HistoryEntry[]>(() => mockScanStore.getRecentScans(3))

  useEffect(() => {
    return mockScanStore.subscribe((scans) => setMockScans(scans))
  }, [])

  if (userHistory.length >= 3) {
    return userHistory.slice(0, 3)
  }
  if (userHistory.length > 0) {
    const combined = [...userHistory, ...mockScans.filter((m) => !userHistory.some((u) => u.id === m.id))]
    return combined.slice(0, 3)
  }
  return mockScans.slice(0, 3)
}

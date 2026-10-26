// Waste collection times for each area team (see src/lib/teams.ts).
// SAMPLE SCHEDULE: replace with the real times from the local municipal body or your
// society's collection service. Days: 1 = Monday … 7 = Sunday. Times are IST, "HH:MM".

export type PickupKind = "wet" | "dry" | "ewaste"

export interface Pickup {
  kind: PickupKind
  days: number[]
  time: string
  where: string
}

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7]

export const PICKUPS: Record<string, Pickup[]> = {
  sohna: [
    { kind: "wet", days: EVERY_DAY, time: "08:00", where: "Door-to-door collection" },
    { kind: "dry", days: [1, 4], time: "09:30", where: "Door-to-door collection" },
    { kind: "ewaste", days: [6], time: "11:00", where: "Sohna Chowk collection point" },
  ],
  badshahpur: [
    { kind: "wet", days: EVERY_DAY, time: "08:15", where: "Door-to-door collection" },
    { kind: "dry", days: [2, 5], time: "09:30", where: "Door-to-door collection" },
    { kind: "ewaste", days: [6], time: "11:30", where: "Market collection point" },
  ],
  "golf-course-ext": [
    { kind: "wet", days: EVERY_DAY, time: "07:30", where: "Society gate" },
    { kind: "dry", days: [1, 3, 5], time: "10:00", where: "Society gate" },
    { kind: "ewaste", days: [7], time: "12:00", where: "Society clubhouse" },
  ],
  "south-city": [
    { kind: "wet", days: EVERY_DAY, time: "08:30", where: "Door-to-door collection" },
    { kind: "dry", days: [2, 4, 6], time: "10:00", where: "Door-to-door collection" },
  ],
  "old-gurugram": [
    { kind: "wet", days: EVERY_DAY, time: "07:45", where: "Lane collection cart" },
    { kind: "dry", days: [1, 4], time: "09:00", where: "Lane collection cart" },
    { kind: "ewaste", days: [3], time: "13:00", where: "Sadar Bazaar collection point" },
  ],
}

export const PICKUP_LABEL: Record<PickupKind, string> = { wet: "Wet waste", dry: "Dry waste", ewaste: "E-waste" }

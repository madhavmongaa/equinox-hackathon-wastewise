// Waste pickup times for each campus team (see src/lib/teams.ts).
// SAMPLE SCHEDULE: replace with the real times from the hostel wardens / estate office.
// Days: 1 = Monday … 7 = Sunday. Times are IST, 24-hour "HH:MM".

export type PickupKind = "wet" | "dry" | "ewaste"

export interface Pickup {
  kind: PickupKind
  days: number[]
  time: string
  where: string
}

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7]

export const PICKUPS: Record<string, Pickup[]> = {
  bh1: [
    { kind: "wet", days: EVERY_DAY, time: "08:00", where: "Ground-floor bin bay" },
    { kind: "dry", days: [1, 4], time: "09:30", where: "Ground-floor bin bay" },
    { kind: "ewaste", days: [6], time: "11:00", where: "Warden's office" },
  ],
  bh2: [
    { kind: "wet", days: EVERY_DAY, time: "08:15", where: "Mess back gate" },
    { kind: "dry", days: [2, 5], time: "09:30", where: "Mess back gate" },
    { kind: "ewaste", days: [6], time: "11:30", where: "Warden's office" },
  ],
  gh: [
    { kind: "wet", days: EVERY_DAY, time: "08:30", where: "Block B bin bay" },
    { kind: "dry", days: [1, 4], time: "10:00", where: "Block B bin bay" },
    { kind: "ewaste", days: [6], time: "12:00", where: "Reception" },
  ],
  day: [
    { kind: "dry", days: [1, 3, 5], time: "16:00", where: "Academic block recycling point" },
    { kind: "ewaste", days: [3], time: "13:00", where: "Library e-waste box" },
  ],
  staff: [
    { kind: "dry", days: [2, 4], time: "15:00", where: "Admin block recycling point" },
    { kind: "ewaste", days: [3], time: "13:00", where: "Library e-waste box" },
  ],
}

export const PICKUP_LABEL: Record<PickupKind, string> = { wet: "Wet waste", dry: "Dry waste", ewaste: "E-waste" }

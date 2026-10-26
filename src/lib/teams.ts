// Area teams for the weekly team leaderboard: everyone in an area sorts for the same
// team. A team is just a field on the profile, so new areas are one line each.

export interface Team {
  id: string
  name: string
  emoji: string
  color: string
}

export const TEAMS: Team[] = [
  { id: "sohna", name: "Sohna", emoji: "🌿", color: "#3C9A4E" },
  { id: "badshahpur", name: "Badshahpur", emoji: "🦁", color: "#2F6FD6" },
  { id: "golf-course-ext", name: "Golf Course Ext. Road", emoji: "⛳", color: "#E0A526" },
  { id: "south-city", name: "South City", emoji: "🏙️", color: "#C2418F" },
  { id: "old-gurugram", name: "Old Gurugram", emoji: "🛺", color: "#7A4FC9" },
]

export function teamById(id: string | null | undefined) {
  return TEAMS.find((t) => t.id === id) ?? null
}

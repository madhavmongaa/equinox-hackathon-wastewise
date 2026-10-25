// Campus teams for the weekly team leaderboard. A team is just a field on the profile.

export interface Team {
  id: string
  name: string
  emoji: string
  color: string
}

export const TEAMS: Team[] = [
  { id: "bh1", name: "Boys Hostel 1", emoji: "🦁", color: "#2F6FD6" },
  { id: "bh2", name: "Boys Hostel 2", emoji: "🐯", color: "#E0A526" },
  { id: "gh", name: "Girls Hostel", emoji: "🦋", color: "#C2418F" },
  { id: "day", name: "Day Scholars", emoji: "🚌", color: "#3C9A4E" },
  { id: "staff", name: "Faculty & Staff", emoji: "📚", color: "#7A4FC9" },
]

export function teamById(id: string | null | undefined) {
  return TEAMS.find((t) => t.id === id) ?? null
}

import type { Profile } from "@/lib/types"

export interface Level {
  name: string
  min: number
  badge: string
}

export const LEVELS: Level[] = [
  { name: "Seedling", min: 0, badge: "🌱" },
  { name: "Sprout", min: 50, badge: "🌿" },
  { name: "Sapling", min: 200, badge: "🪴" },
  { name: "Tree", min: 500, badge: "🌳" },
  { name: "Forest Guardian", min: 1000, badge: "🌲✨" },
]

export function levelFor(points: number) {
  let index = 0
  LEVELS.forEach((l, i) => {
    if (points >= l.min) index = i
  })
  const level = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  const progress = next ? (points - level.min) / (next.min - level.min) : 1
  return { level, next, index, progress, toNext: next ? next.min - points : 0 }
}

export function nextLevelText(points: number) {
  const { next, toNext } = levelFor(points)
  if (!next) return "Top level reached 🌲✨"
  return `${toNext} pts to ${next.name} ${next.badge}`
}

export interface BadgeDef {
  id: string
  name: string
  emoji: string
  description: string
  earned: (p: Profile) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: "first-scan", name: "First Scan", emoji: "🔍", description: "Sorted your first item", earned: (p) => p.totalScans >= 1 },
  { id: "streak-7", name: "7-Day Streak", emoji: "🔥", description: "Sorted 7 days in a row", earned: (p) => p.longestStreak >= 7 },
  { id: "rule-detective", name: "Rule Detective", emoji: "🕵️", description: "Answered 10 clarifying questions", earned: (p) => p.clarificationsAnswered >= 10 },
  { id: "fixer", name: "Fixer", emoji: "🛠️", description: "Made 5 corrections", earned: (p) => p.corrections >= 5 },
  { id: "dump-spotter", name: "Dump Spotter", emoji: "📍", description: "Reported an illegal dump", earned: (p) => (p.dumpsReported ?? 0) >= 1 },
  { id: "challenger", name: "Challenger", emoji: "🎯", description: "Finished a weekly challenge", earned: (p) => (p.challengesCompleted ?? 0) >= 1 },
  { id: "champ", name: "Challenge Champ", emoji: "🏅", description: "Finished 10 weekly challenges", earned: (p) => (p.challengesCompleted ?? 0) >= 10 },
  { id: "team-player", name: "Team Player", emoji: "🤝", description: "Joined a campus team", earned: (p) => !!p.team },
  { id: "century", name: "Century", emoji: "💯", description: "Sorted 100 items", earned: (p) => p.totalScans >= 100 },
]

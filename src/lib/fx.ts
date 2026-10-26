// Small celebration effects drawn straight into the page (no React state), so any
// screen can fire them: points flying to the score, and a confetti burst.
// All of them do nothing when the device asks for reduced motion.

import { prefersReducedMotion } from "@/lib/utils"

// where the last tap or click happened: effects start from there
let lastPointer: { x: number; y: number } | null = null
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => (lastPointer = { x: e.clientX, y: e.clientY }), { capture: true, passive: true })
}

/** The visible points counter to fly to (top bar on laptops, Profile tab on phones). */
function pointsTarget(): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>("[data-points-target]")]
  return all.find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) ?? null
}

/** A "+15" chip that flies from the last tap to the points counter, which then pulses. */
export function flyPoints(amount: number) {
  if (amount <= 0 || prefersReducedMotion()) return
  const target = pointsTarget()
  if (!target) return
  const to = target.getBoundingClientRect()
  const from = lastPointer ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const chip = document.createElement("div")
  chip.textContent = `+${amount}`
  chip.setAttribute("aria-hidden", "true")
  chip.className = "ww-fly-chip"
  chip.style.left = `${from.x}px`
  chip.style.top = `${from.y}px`
  document.body.appendChild(chip)
  const dx = to.left + to.width / 2 - from.x
  const dy = to.top + to.height / 2 - from.y
  const anim = chip.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
      { transform: "translate(-50%, -120%) scale(1.15)", opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5)`, opacity: 0.9 },
    ],
    { duration: 900, easing: "cubic-bezier(.5,0,.2,1)" }
  )
  anim.onfinish = () => {
    chip.remove()
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 350, easing: "ease-out" })
  }
  // animations pause in background tabs; never leave the chip behind
  setTimeout(() => chip.remove(), 1500)
}

const CONFETTI = ["#2E7D4F", "#8FB996", "#E0A526", "#2F6FD6", "#7CF0B4", "#C2418F"]

/** A burst of confetti from a point (the last tap if none is given). */
export function burstConfetti(at?: { x: number; y: number }, count = 26) {
  if (prefersReducedMotion()) return
  const origin = at ?? lastPointer ?? { x: window.innerWidth / 2, y: window.innerHeight / 3 }
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span")
    p.className = "ww-confetti-piece"
    p.setAttribute("aria-hidden", "true")
    p.style.left = `${origin.x}px`
    p.style.top = `${origin.y}px`
    p.style.background = CONFETTI[i % CONFETTI.length]
    document.body.appendChild(p)
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const dist = 60 + Math.random() * 90
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist - 40
    const duration = 900 + Math.random() * 500
    p.animate(
      [
        { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540 - 270}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 80}px)) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(.2,.7,.4,1)" }
    ).onfinish = () => p.remove()
    setTimeout(() => p.remove(), duration + 600)
  }
}

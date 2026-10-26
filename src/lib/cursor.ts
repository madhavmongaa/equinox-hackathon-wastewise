// Custom cursor for mouse and trackpad users: a green arrow (CSS, src/cursor.css) plus a
// ring that eases after the pointer and grows over clickable things. Touch screens and
// reduced-motion users get the arrow only, with no trailing ring. Used by both pages.

import "@/cursor.css"

const CLICKABLE = 'a, button, summary, label, select, [role="button"], [role="tab"], [role="link"], [data-cursor="hover"]'
const TEXT = 'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]'

let started = false

export function setUpCursor() {
  if (started || typeof window === "undefined") return
  if (!window.matchMedia("(pointer: fine)").matches) return
  started = true
  document.documentElement.classList.add("ww-cursor-on")
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const ring = document.createElement("div")
  ring.className = "ww-cursor"
  ring.setAttribute("aria-hidden", "true")
  document.body.appendChild(ring)

  let x = -100
  let y = -100
  let rx = x
  let ry = y
  let frame = 0

  const tick = () => {
    rx += (x - rx) * 0.22
    ry += (y - ry) * 0.22
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
    frame = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(tick) : 0
  }

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return
      x = e.clientX
      y = e.clientY
      if (!ring.classList.contains("is-visible")) {
        rx = x
        ry = y
        ring.classList.add("is-visible")
      }
      const el = e.target instanceof Element ? e.target : null
      ring.classList.toggle("is-text", !!el?.closest(TEXT))
      ring.classList.toggle("is-hover", !!el?.closest(CLICKABLE))
      if (!frame) frame = requestAnimationFrame(tick)
    },
    { passive: true }
  )
  document.addEventListener("pointerdown", () => ring.classList.add("is-down"))
  document.addEventListener("pointerup", () => ring.classList.remove("is-down"))
  document.documentElement.addEventListener("mouseleave", () => ring.classList.remove("is-visible"))
  window.addEventListener("blur", () => ring.classList.remove("is-visible"))
}

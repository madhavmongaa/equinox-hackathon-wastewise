(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneQuery = window.matchMedia("(max-width: 820px)");

  const band = document.getElementById("band");
  const track = document.getElementById("track");

  // ten everyday items and the bin each goes in
  const BINS = {
    dry: { label: "Dry Waste", bin: "Blue bin", color: "#2F6FD6" },
    wet: { label: "Wet Waste", bin: "Green bin", color: "#3C9A4E" },
    hazardous: { label: "Hazardous", bin: "Red bin", color: "#D2463C" },
    reject: { label: "Reject", bin: "Grey bin", color: "#6E6E6E" },
    ewaste: { label: "E-waste", bin: "E-waste drop box", color: "#7A4FC9" },
  };
  const ITEMS = [
    { name: "Plastic bottle", icon: "🥤", cat: "dry" },
    { name: "Banana peel", icon: "🍌", cat: "wet" },
    { name: "Battery", icon: "🔋", cat: "ewaste" },
    { name: "Cardboard box", icon: "📦", cat: "dry" },
    { name: "Greasy pizza box", icon: "🍕", cat: "wet" },
    { name: "Aerosol can", icon: "🧴", cat: "hazardous" },
    { name: "Newspaper", icon: "📰", cat: "dry" },
    { name: "Used tissue", icon: "🧻", cat: "reject" },
    { name: "Light bulb", icon: "💡", cat: "ewaste" },
    { name: "Glass bottle", icon: "🍾", cat: "dry" },
  ];

  // carousel geometry, in frame units (see the spec)
  const COUNT = 10;
  const PITCH = 196;
  const SPAN = COUNT * PITCH;
  const CENTER_X = 720;
  const REACH = 706;
  const CENTER_Y = 687;
  const BAND_TOP = 470;
  const SPEED = 50; // units per second, right → left
  const RADIUS = 15;

  // ---------- build the cards ----------

  const cards = ITEMS.map((item, i) => {
    const bin = BINS[item.cat];
    const el = document.createElement("article");
    el.className = "card";
    el.style.setProperty("--bin", bin.color);
    el.setAttribute("aria-label", `${item.name}: ${bin.label}, ${bin.bin}`);

    const face = document.createElement("div");
    face.className = "face";
    face.innerHTML = `
      <span class="icon" aria-hidden="true">${item.icon}</span>
      <span class="name">${item.name}</span>
      <span class="bin"><i></i>${bin.label}</span>
      <span class="where">${bin.bin}</span>`;
    el.appendChild(face);

    track.appendChild(el);
    return { el, face, i };
  });

  // ---------- geometry ----------

  const q = (x) => Math.min(1, Math.abs(x - CENTER_X) / REACH);
  const edgeHeight = (x) => 280 + 92 * Math.pow(q(x), 2.6);

  /** Rounded quad as an SVG path (clip-path: path()). */
  function roundedQuad(pts, r) {
    const n = pts.length;
    const unit = (a, b) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      return [dx / len, dy / len];
    };
    let d = "";
    for (let k = 0; k < n; k++) {
      const p = pts[k];
      const prev = pts[(k + n - 1) % n];
      const next = pts[(k + 1) % n];
      const a = unit(p, prev);
      const b = unit(p, next);
      const start = [p[0] + a[0] * r, p[1] + a[1] * r];
      const end = [p[0] + b[0] * r, p[1] + b[1] * r];
      d += `${k === 0 ? "M" : "L"}${start[0].toFixed(2)} ${start[1].toFixed(2)} Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)} `
    }
    return `path("${d}Z")`;
  }

  // ---------- layout state ----------

  let u = 1;
  let originX = 0; // px position of frame x = 720 inside the band
  let originY = 0; // px position of frame y = 687 inside the band
  let halfView = 1000; // half the band width, in units

  function measure() {
    const rect = band.getBoundingClientRect();
    if (phoneQuery.matches) {
      u = window.innerWidth / 640;
      originX = rect.width / 2;
      originY = rect.height / 2;
    } else {
      u = document.getElementById("frame").getBoundingClientRect().width / 1440;
      originX = rect.width / 2;
      originY = (CENTER_Y - BAND_TOP) * u;
    }
    halfView = rect.width / 2 / u;
    // card content scales with the carousel (a touch larger on phones so small labels stay readable)
    band.style.setProperty("--cu", `${phoneQuery.matches ? u * 1.15 : u}px`);
  }

  // ---------- motion ----------

  let offset = 0; // units
  let velocity = 0; // units per second (momentum after a fling)
  let dragging = false;
  let lastX = 0;
  let lastMoveT = 0;
  let dragVel = 0;

  function place(card) {
    // unpushed offset from the centre, wrapped so the row loops seamlessly
    let t = (((card.i * PITCH + offset) % SPAN) + SPAN) % SPAN - SPAN / 2;
    const cx = CENTER_X + t * (1 + 0.083 * Math.pow(t / REACH, 2));
    const d = q(cx);
    const w = 170 + 48 * d * d;
    const yc = CENTER_Y - 12 * d * d;
    const xl = cx - w / 2;
    const xr = cx + w / 2;
    const hl = edgeHeight(xl);
    const hr = edgeHeight(xr);

    // fade out right where the row wraps (only visible on very wide screens)
    const far = Math.abs(cx - CENTER_X);
    const wrapAt = SPAN / 2 * (1 + 0.083 * Math.pow(SPAN / 2 / REACH, 2)) - w;
    const opacity = Math.max(0, Math.min(1, (wrapAt - far) / 60));
    if (far - w > halfView || opacity === 0) {
      card.el.style.visibility = "hidden";
      return;
    }
    card.el.style.visibility = "visible";
    card.el.style.opacity = opacity < 1 ? opacity.toFixed(3) : "";

    // box (units) and the quad inside it (px)
    const top = yc - Math.max(hl, hr) / 2;
    const boxH = Math.max(hl, hr);
    const pts = [
      [0, (yc - hl / 2 - top) * u],
      [w * u, (yc - hr / 2 - top) * u],
      [w * u, (yc + hr / 2 - top) * u],
      [0, (yc + hl / 2 - top) * u],
    ];

    const pxW = w * u;
    const pxH = boxH * u;
    const x = originX + (xl - CENTER_X) * u;
    const y = originY + (top - CENTER_Y) * u;

    const el = card.el.style;
    el.width = `${pxW}px`;
    el.height = `${pxH}px`;
    el.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.clipPath = roundedQuad(pts, RADIUS * u);

    // keep the card's content inside the slanted top and bottom edges
    const faceTop = Math.max(pts[0][1], pts[1][1]);
    const faceBottom = Math.min(pts[2][1], pts[3][1]);
    card.face.style.transform = `translate3d(0, ${faceTop}px, 0)`;
    card.face.style.height = `${faceBottom - faceTop}px`;
  }

  // a long-running Web Animations clock, so the scroll is time-based
  const clock = document.documentElement.animate([], { duration: 1e9 });
  let lastClock = 0;

  function frame() {
    const now = Number(clock.currentTime) || 0;
    const dt = Math.min(0.05, Math.max(0, (now - lastClock) / 1000));
    lastClock = now;

    if (!dragging) {
      if (!reduced) offset -= SPEED * dt;
      if (Math.abs(velocity) > 0.5) {
        offset += velocity * dt;
        velocity *= Math.pow(0.05, dt); // ~95% of the fling decays each second
      } else {
        velocity = 0;
      }
    }
    for (const c of cards) place(c);
    requestAnimationFrame(frame);
  }

  // ---------- dragging (pointer + touch) ----------

  band.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    velocity = 0;
    dragVel = 0;
    lastX = e.clientX;
    lastMoveT = performance.now();
    band.classList.add("dragging");
    band.setPointerCapture(e.pointerId);
  });

  band.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = (e.clientX - lastX) / u; // follows the pointer 1:1
    offset += dx;
    const dtMs = Math.max(8, now - lastMoveT);
    dragVel = dragVel * 0.6 + (dx / dtMs) * 1000 * 0.4;
    lastX = e.clientX;
    lastMoveT = now;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    band.classList.remove("dragging");
    // no fling if the pointer rested before letting go
    const rested = performance.now() - lastMoveT > 90;
    velocity = rested ? 0 : Math.max(-3000, Math.min(3000, dragVel));
  };
  band.addEventListener("pointerup", endDrag);
  band.addEventListener("pointercancel", endDrag);
  band.addEventListener("lostpointercapture", endDrag);
  band.addEventListener("dragstart", (e) => e.preventDefault());

  measure();
  window.addEventListener("resize", measure);
  phoneQuery.addEventListener?.("change", measure);
  requestAnimationFrame(frame);

  // ---------- entrance (one Web Animations sequence) ----------

  if (reduced || !Element.prototype.animate) return;

  const ease = "cubic-bezier(.2, .8, .2, 1)";
  const run = (els, keyframes, delay, duration, stagger = 0) =>
    [...els].forEach((el, i) =>
      el.animate(keyframes, { delay: (delay + i * stagger) * 1000, duration: duration * 1000, easing: ease, fill: "backwards" })
    );
  const $$ = (s) => document.querySelectorAll(s);
  const keepRotation = (el) => getComputedStyle(el).transform === "none" ? "" : getComputedStyle(el).transform;

  run($$(".brand, .nav a, .pill"), [{ opacity: 0, transform: "translateY(-14px)" }, { opacity: 1, transform: "translateY(0)" }], 0, 0.6, 0.04);
  run($$(".badge"), [{ opacity: 0, transform: "scale(.82)" }, { opacity: 1, transform: "scale(1)" }], 0.25, 0.5);
  run($$(".line"), [{ opacity: 0, filter: "blur(12px)", transform: "translateY(26px)" }, { opacity: 1, filter: "blur(0)", transform: "translateY(0)" }], 0.4, 0.8, 0.14);
  run($$(".subline"), [{ opacity: 0, filter: "blur(6px)", transform: "translateY(12px)" }, { opacity: 1, filter: "blur(0)", transform: "translateY(0)" }], 0.85, 0.7);
  run($$(".track"), [{ opacity: 0, transform: "translateY(60px)" }, { opacity: 1, transform: "translateY(0)" }], 1.0, 1.0);
  run($$(".cta-ring"), [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "scale(1)" }], 1.3, 0.55);
  run($$(".doodle .draw"), [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 1.55, 0.7, 0.12);
  $$(".doodle .draw").forEach((p) => (p.style.strokeDasharray = "1"));
  $$(".note").forEach((n, i) => {
    const base = keepRotation(n);
    n.animate(
      [{ opacity: 0, transform: `${base} translateY(8px)` }, { opacity: 1, transform: `${base} translateY(0)` }],
      { delay: (1.6 + i * 0.15) * 1000, duration: 600, easing: ease, fill: "backwards" }
    );
  });
})();

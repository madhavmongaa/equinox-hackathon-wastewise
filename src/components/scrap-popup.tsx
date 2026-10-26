import { useEffect, useState } from "react"
import { ArrowRight, X } from "lucide-react"
import { SCRAP_KINDS, type ScrapFind } from "@/lib/scrap"
import { estimateScrap, rupees } from "@/lib/scrapPrices"

/** Floats over a scan result when it contains sellable scrap: "sell it, don't bin it". */
export function ScrapPopup({ find, onFind }: { find: ScrapFind; onFind: () => void }) {
  const [open, setOpen] = useState(false)
  // let the result settle in first
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(t)
  }, [])
  if (!open) return null

  const kinds = SCRAP_KINDS.filter((k) => find.kinds.includes(k.id))
  const what = find.items.length === 1 ? find.items[0] : `${find.items.length} items`
  const estimate = find.items.length === 1 ? estimateScrap(find.items[0], find.kinds) : null
  return (
    <div
      role="dialog"
      aria-labelledby="scrap-popup-title"
      className="fixed inset-x-0 bottom-[164px] z-[60] mx-auto w-full max-w-[440px] px-4 lg:bottom-8 lg:left-auto lg:right-28 lg:mx-0"
    >
      <div className="ww-pop flex items-start gap-3 rounded-[22px] bg-green p-4 text-white shadow-[0_14px_40px_rgba(8,72,45,0.45)]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-xl" aria-hidden>
          {kinds[0]?.emoji ?? "♻️"}
        </span>
        <div className="min-w-0 flex-1">
          <p id="scrap-popup-title" className="font-bold">
            Sell it, don't bin it
          </p>
          <p className="mt-0.5 text-sm text-white/85">
            <span className="capitalize">{what}</span> {find.items.length === 1 ? "is" : "include"} {kinds.map((k) => k.label.toLowerCase()).join(" & ")} scrap. Kabadiwalas nearby buy it.
          </p>
          {estimate && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 rounded-[12px] bg-white/12 px-3 py-1.5 text-sm">
              {estimate.item && <span className="font-bold">About {rupees(estimate.item)} for this</span>}
              <span className="text-white/80">
                {estimate.material}: {rupees(estimate.perKg)}/kg
              </span>
            </p>
          )}
          {estimate && <p className="mt-1 text-[11px] text-white/65">Typical local rates; dealers pay more for a bigger pile.</p>}
          <button
            onClick={onFind}
            className="ww-press mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-[#08482D]"
          >
            Book a pickup <ArrowRight size={16} />
          </button>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Dismiss" className="ww-press -mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/15">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

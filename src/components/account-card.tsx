import { LogIn, ShieldCheck, UserPlus, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { accountsAvailable, useAccount } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useApp } from "@/state/AppContext"
import { t, useLang } from "@/lib/i18n"

/** Profile: who you're signed in as, or a nudge to create an account. */
export function AccountCard({ className }: { className?: string }) {
  const { navigate } = useApp()
  const account = useAccount()
  if (!accountsAvailable || !account) return null

  if (account.isGuest) {
    return (
      <div className={cn("glass space-y-3 p-4 lg:flex lg:items-center lg:gap-3 lg:space-y-0", className)}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint text-green">
            <UserRound size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">You're using WasteWise as a guest</p>
            <p className="text-xs text-sub">Create an account to keep your points on any device.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
          <Button size="sm" onClick={() => navigate({ name: "account", mode: "create" })}>
            <UserPlus size={16} /> Create account
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate({ name: "account", mode: "signin" })}>
            <LogIn size={16} /> Sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => navigate({ name: "account" })} className={cn("ww-press glass flex w-full items-center gap-3 p-4 text-left", className)}>
      <AccountAvatar size={44} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{account.email ?? account.name}</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-green">
          <ShieldCheck size={13} /> Signed in · manage account
        </span>
      </span>
    </button>
  )
}

/** Round avatar for the signed-in account (Google photo or initial); a person icon for guests. */
export function AccountAvatar({ size = 36 }: { size?: number }) {
  const account = useAccount()
  if (!account || account.isGuest) {
    return (
      <span className="grid shrink-0 place-items-center rounded-full bg-mint text-green" style={{ width: size, height: size }}>
        <UserRound size={size * 0.5} />
      </span>
    )
  }
  if (account.photo) {
    return <img src={account.photo} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  const initial = (account.name || account.email || "?").trim()[0]?.toUpperCase()
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-green font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {initial}
    </span>
  )
}

/** Top-bar button: "Sign in" for guests, the avatar once signed in. */
export function AccountButton() {
  const { navigate } = useApp()
  const lang = useLang()
  const account = useAccount()
  if (!accountsAvailable || !account) return null
  if (account.isGuest) {
    return (
      <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate({ name: "account", mode: "signin" })}>
        <LogIn size={16} /> {t("Sign in", lang)}
      </Button>
    )
  }
  return (
    <button onClick={() => navigate({ name: "account" })} aria-label={`Account: ${account.email ?? account.name}`} className="ww-press shrink-0 rounded-full">
      <AccountAvatar size={40} />
    </button>
  )
}

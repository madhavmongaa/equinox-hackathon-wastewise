// Accounts on top of the anonymous guest sign-in.
// Creating an account (email or Google) upgrades the current guest in place, so its uid,
// points and leaderboard name carry over. Signing in to an existing account switches to it.

import { useEffect, useState } from "react"
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  onIdTokenChanged,
  signOut,
  type User,
} from "firebase/auth"
import { auth, firebaseConfigured, watchUser } from "@/lib/firebase"

export interface Account {
  uid: string
  isGuest: boolean
  email: string | null
  name: string | null
  photo: string | null
  verified: boolean
  /** "password", "google.com" */
  providers: string[]
}

function toAccount(u: User): Account {
  return {
    uid: u.uid,
    isGuest: u.isAnonymous,
    email: u.email,
    name: u.displayName,
    photo: u.photoURL,
    verified: u.emailVerified,
    providers: u.providerData.map((p) => p.providerId),
  }
}

// Upgrading a guest (linking email or Google) keeps the same user, so Firebase's
// sign-in/out event doesn't fire; account screens also refresh when we say so.
const refreshers = new Set<() => void>()
function refreshAccounts() {
  refreshers.forEach((r) => r())
}

/** The signed-in account (a guest until the user signs in), or null while Firebase starts. */
export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(() => (auth?.currentUser ? toAccount(auth.currentUser) : null))
  useEffect(() => {
    const read = () => setAccount(auth?.currentUser ? toAccount(auth.currentUser) : null)
    refreshers.add(read)
    const stopAuth = watchUser((u) => setAccount(u ? toAccount(u) : null))
    // token changes also cover linking and email verification
    const stopToken = auth ? onIdTokenChanged(auth, (u) => setAccount(u ? toAccount(u) : null)) : () => {}
    return () => {
      refreshers.delete(read)
      stopAuth()
      stopToken()
    }
  }, [])
  return account
}

export const accountsAvailable = firebaseConfigured

function need() {
  if (!auth) throw new AuthProblem("Accounts need the Firebase settings in .env.local.")
  return auth
}

export class AuthProblem extends Error {}

/** Firebase error codes in plain words. */
export function authMessage(err: unknown): string {
  if (err instanceof AuthProblem) return err.message
  const code = (err as { code?: string })?.code ?? ""
  const messages: Record<string, string> = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/missing-password": "Enter a password.",
    "auth/weak-password": "Use at least 6 characters for the password.",
    "auth/email-already-in-use": "There's already an account with this email. Sign in instead.",
    "auth/credential-already-in-use": "That account already exists. Sign in instead.",
    "auth/invalid-credential": "Email or password is wrong.",
    "auth/wrong-password": "Email or password is wrong.",
    "auth/user-not-found": "No account with that email. Create one instead.",
    "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
    "auth/network-request-failed": "No connection. Check your internet and try again.",
    "auth/popup-closed-by-user": "The Google window was closed before signing in.",
    "auth/cancelled-popup-request": "The Google window was closed before signing in.",
    "auth/popup-blocked": "The browser blocked the Google window. Allow pop-ups and try again.",
    "auth/operation-not-allowed": "This sign-in method isn't turned on in Firebase yet (Authentication → Sign-in method).",
    "auth/unauthorized-domain": "This web address isn't allowed for Google sign-in in Firebase (Authentication → Settings → Authorized domains).",
    "auth/requires-recent-login": "Please sign in again first.",
    "auth/configuration-not-found": "Authentication isn't set up in Firebase yet (Authentication → Get started).",
    "auth/admin-restricted-operation": "Guest sign-in is turned off in Firebase (Authentication → Sign-in method → Anonymous).",
    "auth/invalid-api-key": "The Firebase API key in .env.local is wrong.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "The Firebase API key in .env.local is wrong.",
    "auth/provider-already-linked": "This account already has that sign-in method.",
    "auth/user-disabled": "This account has been turned off.",
    "auth/invalid-login-credentials": "Email or password is wrong.",
    "auth/missing-email": "Enter your email address.",
    "auth/user-token-expired": "Your session ran out. Please sign in again.",
    "auth/invalid-user-token": "Your session ran out. Please sign in again.",
  }
  if (!messages[code]) console.warn("[auth] sign-in failed:", code || err)
  return messages[code] ?? `Something went wrong${code ? ` (${code})` : ""}. Please try again.`
}

/** New account with email + password. A guest is upgraded in place (same uid, keeps points). */
export async function createAccount(email: string, password: string) {
  const a = need()
  const current = a.currentUser
  const cred = current?.isAnonymous
    ? await linkWithCredential(current, EmailAuthProvider.credential(email.trim(), password))
    : await createUserWithEmailAndPassword(a, email.trim(), password)
  await sendEmailVerification(cred.user).catch(() => {})
  await cred.user.reload().catch(() => {})
  refreshAccounts()
  return toAccount(a.currentUser ?? cred.user)
}

/** Sign in to an existing account (this device switches to that account's profile). */
export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(need(), email.trim(), password)
  refreshAccounts()
  return toAccount(cred.user)
}

/**
 * Google: upgrades a guest in place; if that Google account already exists,
 * switches to it instead (the guest's points stay with the guest).
 */
export async function continueWithGoogle(): Promise<{ account: Account; switched: boolean }> {
  const a = need()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  const current = a.currentUser
  if (current?.isAnonymous) {
    try {
      const cred = await linkWithPopup(current, provider)
      refreshAccounts()
      return { account: toAccount(cred.user), switched: false }
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
        const existing = GoogleAuthProvider.credentialFromError(err as never)
        if (existing) {
          const cred = await signInWithCredential(a, existing)
          refreshAccounts()
          return { account: toAccount(cred.user), switched: true }
        }
      }
      throw err
    }
  }
  const cred = await signInWithPopup(a, provider)
  refreshAccounts()
  return { account: toAccount(cred.user), switched: true }
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(need(), email.trim())
}

export async function resendVerification() {
  const u = need().currentUser
  if (u && !u.isAnonymous) await sendEmailVerification(u)
}

/** Sign out, then carry on as a fresh guest so scanning and points keep working. */
export async function signOutToGuest() {
  const a = need()
  await signOut(a)
  await signInAnonymously(a)
  refreshAccounts()
}

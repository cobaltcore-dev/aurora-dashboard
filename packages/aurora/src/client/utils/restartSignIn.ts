type SessionClient = { auth: { terminateUserSession: { mutate: () => Promise<unknown> } } }
type SignInLocation = Pick<Location, "pathname" | "search" | "hash" | "replace">

/** Reload auth state after a 401, preserving the full same-origin return URL. */
export async function restartSignIn(client: SessionClient, location: SignInLocation = window.location) {
  const returnUrl = location.pathname + location.search + location.hash
  try {
    await client.auth.terminateUserSession.mutate()
  } catch {
    // An already-expired BFF session can reject termination; still restart the client auth flow.
  }
  location.replace(`/?redirect=${encodeURIComponent(returnUrl)}`)
}

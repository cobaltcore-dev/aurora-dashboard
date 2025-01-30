import type { CreateAuroraFastifyContextOptions } from "@cobaltcore-dev/aurora-sdk"

export async function createContext(opts: CreateAuroraFastifyContextOptions) {
  const setSessionCookie = (authToken: string | null, options?: { expires: Date }) => {
    if (!authToken) return
    opts.res.setCookie("aurora-session", authToken, {
      secure: true,
      httpOnly: true,
      sameSite: "strict",
      expires: options?.expires || undefined,
    })
  }
  const getSessionCookie = () => {
    return opts.req.cookies["aurora-session"]
  }

  const deleteSessionCookie = () => {
    // Clear the cookie by setting an empty value and an immediate expiration date
    opts.res.setCookie("aurora-session", "", {
      httpOnly: true, // Optional: to make it inaccessible via JavaScript
      secure: true, // Optional: set to true for HTTPS
      sameSite: "strict", // Optional: controls cross-site behavior
      expires: new Date(0), // Expire immediately
    })
  }

  return { setSessionCookie, getSessionCookie, deleteSessionCookie }
}

export type Context = Awaited<ReturnType<typeof createContext>>

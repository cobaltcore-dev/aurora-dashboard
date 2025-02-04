import { AuroraContext, Token } from "@cobaltcore-dev/aurora-sdk"
import type { CreateAuroraFastifyContextOptions } from "@cobaltcore-dev/aurora-sdk"

export interface AuroraPortalContext extends AuroraContext {
  setSessionCookie: (authToken: string | null, options?: { expires: Date }) => void
  getSessionCookie: () => string | undefined
  deleteSessionCookie: () => void
}

export async function createContext(opts: CreateAuroraFastifyContextOptions): Promise<AuroraPortalContext> {
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

  const validateAuthToken = (authToken: string | null) => {
    // Validate the authToken
    // For example, check if the token is expired
    // If the token is invalid, set it to null
    const token: Token = JSON.parse(Buffer.from(authToken || "", "base64").toString("utf-8"))
    return Promise.resolve(token)
  }

  return {
    setSessionCookie,
    getSessionCookie,
    deleteSessionCookie,
    validateAuthToken,
    authToken: opts.req.cookies["aurora-session"] ?? null,
  }
}

import {
  AuroraContext,
  AuroraSession,
  Token,
  CreateAuroraFastifyContextOptions,
} from "@cobaltcore-dev/aurora-sdk/server"
import { validateToken } from "./Identity/services/authApi"

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

  const authToken = getSessionCookie()
  let token: Token | null = null

  const validateSession = async (): Promise<AuroraSession> => {
    if (!authToken) return { authToken: null, token: null }

    token = token || (await validateToken(authToken))

    return { authToken, token }
  }

  return {
    setSessionCookie,
    getSessionCookie,
    deleteSessionCookie,
    validateSession,
  }
}

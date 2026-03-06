import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"
import * as dotenv from "dotenv"

dotenv.config()
export interface SessionProps {
  cookieName?: string

  req: CreateFastifyContextOptions["req"]
  res: CreateFastifyContextOptions["res"]
}

export const SessionCookieName = process.env.DASHBOARD_COOKIE_NAME || "dashboard-session-auth"

// Enable cross-dashboard domain (wildcard subdomain) via environment variable
// Default: true (enabled). Set to "false" to disable.
const ENABLE_CROSS_DASHBOARD_DOMAIN = process.env.ENABLE_CROSS_DASHBOARD_COOKIE !== "false"

/**
 * Extract the shared domain for cross-dashboard cookie access.
 * Examples: aurora.qa-de-1.cloud.sap → .qa-de-1.cloud.sap
 */
function extractCookieDomain(hostname: string): string | undefined {
  // Only extract domain if cross-dashboard mode is enabled
  if (!ENABLE_CROSS_DASHBOARD_DOMAIN) {
    return undefined
  }

  // Localhost or IP addresses don't need a domain
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined
  }

  const parts = hostname.split(".")
  if (parts.length >= 3) {
    // Remove first subdomain (aurora/dashboard) and add leading dot
    return `.${parts.slice(1).join(".")}`
  }

  return undefined
}

export function SessionCookie({ cookieName = SessionCookieName, req, res }: SessionProps) {
  const cookieDomain = extractCookieDomain(req.hostname)

  const DEFAULT_COOKIE_VALUES = {
    secure: process.env.NODE_ENV === "production", // Only secure in production
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    ...(cookieDomain && { domain: cookieDomain }),
  } as const

  // Debug logging (can be removed later)
  if (process.env.NODE_ENV !== "production") {
    console.log("[SessionCookie] Config:", {
      hostname: req.hostname,
      cookieDomain,
      cookieName,
      allCookies: req.cookies,
      targetCookie: req.cookies[cookieName],
    })
  }

  return {
    set: (content?: string | null, options?: { expires: Date }) => {
      if (!content) return
      res.setCookie(cookieName, content, {
        ...DEFAULT_COOKIE_VALUES, // Use default values
        expires: options?.expires || undefined,
      })
    },
    get: () => req.cookies[cookieName],

    del: () => {
      res.setCookie(cookieName, "", {
        ...DEFAULT_COOKIE_VALUES, // Use default values
        expires: new Date(0), // Make the cookie expire immediately
      })
    },
  }
}

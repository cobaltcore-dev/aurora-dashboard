import type { FastifyRequest, FastifyReply } from "fastify"
import "@fastify/cookie"

export interface SessionProps {
  cookieName?: string
  /**
   * Explicit cookie domain for cross-subdomain sharing (e.g., ".qa-de-1.cloud.sap").
   *
   * Setting a parent domain (e.g., ".example.com") shares bearer session cookies
   * across ALL subdomains under that domain. Only enable this when all sibling
   * subdomains are equally trusted (same security posture, admin team, etc.).
   * An attacker who compromises ANY subdomain can steal session cookies for ALL
   * subdomains.
   *
   * Default behavior (cookieDomain = undefined): Host-only cookies that are NOT
   * shared across subdomains. This is the secure default.
   */
  cookieDomain?: string
  insecureCookies?: boolean
  req: FastifyRequest
  res: FastifyReply
}

export const DEFAULT_COOKIE_NAME = "dashboard-session-auth"

export function SessionCookie({
  cookieName = DEFAULT_COOKIE_NAME,
  cookieDomain,
  insecureCookies = false,
  req,
  res,
}: SessionProps) {
  const DEFAULT_COOKIE_VALUES = {
    secure: !insecureCookies,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    ...(cookieDomain && { domain: cookieDomain }),
  } as const

  return {
    set: (content?: string | null, options?: { expires: Date }) => {
      if (!content) return
      res.setCookie(cookieName, content, {
        ...DEFAULT_COOKIE_VALUES,
        expires: options?.expires || undefined,
      })
    },
    get: () => req.cookies[cookieName],

    del: () => {
      res.setCookie(cookieName, "", {
        ...DEFAULT_COOKIE_VALUES,
        expires: new Date(0),
      })
    },
  }
}

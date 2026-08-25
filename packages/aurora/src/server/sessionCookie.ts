import type { FastifyRequest, FastifyReply } from "fastify"
import "@fastify/cookie"

export interface SessionProps {
  cookieName?: string
  /**
   * Explicit cookie domain for cross-subdomain sharing (e.g., ".qa-de-1.cloud.sap").
   *
   * SECURITY WARNING: Setting a parent domain (e.g., ".example.com") shares bearer
   * session cookies across ALL sibling subdomains. Only enable when all subdomains
   * are equally trusted (same security posture, admin team, infrastructure).
   *
   * Leaving this undefined (default) restricts cookies to the exact host only,
   * preventing cross-subdomain access even if an attacker compromises a sibling domain.
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

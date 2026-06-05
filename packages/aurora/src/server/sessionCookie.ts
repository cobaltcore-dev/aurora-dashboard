import type { FastifyRequest, FastifyReply } from "fastify"
import "@fastify/cookie"

export interface SessionProps {
  cookieName?: string
  crossDomainCookie?: boolean
  insecureCookies?: boolean
  req: FastifyRequest
  res: FastifyReply
}

const DEFAULT_COOKIE_NAME = "dashboard-session-auth"

function extractCookieDomain(hostname: string, crossDomainCookie: boolean): string | undefined {
  if (!crossDomainCookie) return undefined

  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined
  }

  const parts = hostname.split(".")
  if (parts.length >= 3) {
    return `.${parts.slice(1).join(".")}`
  }

  return undefined
}

export function SessionCookie({
  cookieName = DEFAULT_COOKIE_NAME,
  crossDomainCookie = true,
  insecureCookies = false,
  req,
  res,
}: SessionProps) {
  const cookieDomain = extractCookieDomain(req.hostname, crossDomainCookie)

  const DEFAULT_COOKIE_VALUES = {
    secure: !insecureCookies,
    httpOnly: true,
    sameSite: "strict",
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

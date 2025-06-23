import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"

export interface SessionProps {
  cookieName?: string

  req: CreateFastifyContextOptions["req"]
  res: CreateFastifyContextOptions["res"]
}

export const SessionCookieName = "aurora-session"

const DEFAULT_COOKIE_VALUES = {
  secure: true,
  httpOnly: true,
  sameSite: "strict",
  path: "/polaris-bff", // Optional: if set, must be the same for both set and del
} as const

export function SessionCookie({ cookieName = SessionCookieName, req, res }: SessionProps) {
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

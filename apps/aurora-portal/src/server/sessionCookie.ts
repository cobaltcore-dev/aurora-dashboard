import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"
import * as dotenv from "dotenv"

dotenv.config()
export interface SessionProps {
  cookieName?: string

  req: CreateFastifyContextOptions["req"]
  res: CreateFastifyContextOptions["res"]
}

const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

export const SessionCookieName = "aurora-session"

const DEFAULT_COOKIE_VALUES = {
  secure: true,
  httpOnly: true,
  sameSite: "strict",
  path: BFF_ENDPOINT, // Optional: if set, must be the same for both set and del
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

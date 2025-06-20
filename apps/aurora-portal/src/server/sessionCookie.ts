import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"

export interface SessionProps {
  cookieName?: string

  req: CreateFastifyContextOptions["req"]
  res: CreateFastifyContextOptions["res"]
}

export const SessionCookieName = "aurora-session"

export function SessionCookie({ cookieName = SessionCookieName, req, res }: SessionProps) {
  return {
    set: (content?: string | null, options?: { expires: Date }) => {
      if (!content) return
      res.setCookie(cookieName, content, {
        secure: true,
        httpOnly: true,
        sameSite: "strict",
        expires: options?.expires || undefined,
        path: "/polaris-bff", // Optional: if set, must be the same for both set and del
      })
    },
    get: () => req.cookies[cookieName],

    del: () => {
      res.setCookie(cookieName, "", {
        secure: true, // Important: same as when setting it
        httpOnly: true, // Important: same as when setting it
        sameSite: "strict", // Important: same as when setting it
        expires: new Date(0), // Make the cookie expire immediately
        path: "/polaris-bff", // Optional: if set, it must be the same here as well
      })
    },
  }
}

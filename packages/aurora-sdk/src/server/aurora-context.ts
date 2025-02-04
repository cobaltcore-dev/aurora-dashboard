import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"
import "@fastify/cookie"

export async function createContext(opts: CreateFastifyContextOptions) {
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

//#################### NEW
export type Context = Awaited<ReturnType<typeof createContext>>

export type Token = {
  audit_ids: string[]
  catalog: {
    endpoints: {
      id: string
      interface: "public" | "admin" | "internal"
      region: string
      region_id: string
      url: string
    }[]
    type: string
    id: string
    name: string
  }[]
  expires_at: string
  issued_at: string
  methods: string[]
  roles: {
    id: string
    name: string
  }[]
  system: {
    all: boolean
  }
  user: {
    domain: {
      id: string
      name: string
    }
    id: string
    name: string
    password_expires_at: string | null
  }
}

export interface AuroraContext {
  authToken: string | null
  validateAuthToken: (authToken: string) => Promise<Token>
}

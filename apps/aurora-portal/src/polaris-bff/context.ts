import { AuroraContext } from "@cobaltcore-dev/aurora-sdk"
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

  const validateAuthToken = () => {
    // Validate the authToken
    // For example, check if the token is expired
    // If the token is invalid, set it to null
    const token = {
      token: {
        audit_ids: ["3T2dc1CGQxyJsHdDu1xkcw"],
        catalog: [
          {
            endpoints: [
              {
                id: "068d1b359ee84b438266cb736d81de97",
                interface: "public",
                region: "RegionOne",
                region_id: "RegionOne",
                url: "http://example.com/identity",
              },
              {
                id: "8bfc846841ab441ca38471be6d164ced",
                interface: "admin",
                region: "RegionOne",
                region_id: "RegionOne",
                url: "http://example.com/identity",
              },
              {
                id: "beb6d358c3654b4bada04d4663b640b9",
                interface: "internal",
                region: "RegionOne",
                region_id: "RegionOne",
                url: "http://example.com/identity",
              },
            ],
            type: "identity",
            id: "050726f278654128aba89757ae25950c",
            name: "keystone",
          },
        ],
        expires_at: "2015-11-07T02:58:43.578887Z",
        issued_at: "2015-11-07T01:58:43.578929Z",
        methods: ["password"],
        roles: [
          {
            id: "51cc68287d524c759f47c811e6463340",
            name: "admin",
          },
        ],
        system: {
          all: true,
        },
        user: {
          domain: {
            id: "default",
            name: "Default",
          },
          id: "ee4dfb6e5540447cb3741905149d9b6e",
          name: "admin",
          password_expires_at: "2016-11-06T15:32:17.000000",
        },
      },
    }

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

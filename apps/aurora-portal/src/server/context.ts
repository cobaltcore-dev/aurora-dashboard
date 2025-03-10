import { AuroraContext, CreateAuroraFastifyContextOptions } from "@cobaltcore-dev/aurora-sdk/server"
import { SignalOpenstackSession, SignalOpenstackSessionType, AuthConfig } from "@cobaltcore-dev/signal-openstack"

import * as dotenv from "dotenv"

// Load the identity endpoint from the environment
dotenv.config()
const identityEndpoint = process.env.IDENTITY_ENDPOINT
// Ensure it ends with a single slash
const normalizedEndpoint = identityEndpoint?.endsWith("/") ? identityEndpoint : `${identityEndpoint}/`
const defaultSignalOpenstackOptions = {
  interfaceName: process.env.DEFAULT_ENDPOINT_INTERFACE || "public",
  debug: process.env.NODE_ENV !== "production",
}

export interface AuroraPortalContext extends AuroraContext {
  createSession: (params: { user: string; password: string; domain: string }) => SignalOpenstackSessionType
  rescopeSession: (scope: AuthConfig["auth"]["scope"]) => Promise<Awaited<SignalOpenstackSessionType | null>>
  terminateSession: () => Promise<void>
}

function SessionCookie(cookieName: string, opts: CreateAuroraFastifyContextOptions) {
  return {
    set: (content?: string | null, options?: { expires: Date }) => {
      if (!content) return
      opts.res.setCookie(cookieName, content, {
        secure: true,
        httpOnly: true,
        sameSite: "strict",
        expires: options?.expires || undefined,
        path: "polaris-bff", // Optional: if set, must be the same for both set and del
      })
    },
    get: () => opts.req.cookies[cookieName],

    del: () => {
      opts.res.setCookie(cookieName, "", {
        secure: true, // Wichtig: gleich wie beim Setzen
        httpOnly: true, // Wichtig: gleich wie beim Setzen
        sameSite: "strict", // Wichtig: gleich wie beim Setzen
        expires: new Date(0), // Cookie sofort ablaufen lassen
        path: "polaris-bff", // Optional: falls gesetzt, muss es auch hier gleich sein
      })
    },
  }
}

export async function createContext(opts: CreateAuroraFastifyContextOptions): Promise<AuroraPortalContext> {
  const sessionCookie = SessionCookie("aurora-session", opts)
  const currentAuthToken = sessionCookie.get()
  let openstackSession: Awaited<SignalOpenstackSessionType> | undefined = undefined

  // If we have a token, initialize the session
  if (currentAuthToken) {
    openstackSession = await SignalOpenstackSession(
      normalizedEndpoint,
      {
        auth: {
          identity: {
            methods: ["token"],
            token: { id: currentAuthToken },
          },
        },
      },
      defaultSignalOpenstackOptions
    ).catch(() => {
      // If the token is invalid, clear the cookie
      sessionCookie.del()
      return undefined
    })
  }

  const validateSession = () => openstackSession?.isValid() || false

  // Create a new session (Login)
  const createSession: AuroraPortalContext["createSession"] = async (params) => {
    openstackSession = await SignalOpenstackSession(
      normalizedEndpoint,
      {
        auth: {
          identity: {
            methods: ["password"],
            password: { user: { name: params.user, password: params.password, domain: { name: params.domain } } },
          },
          scope: {
            domain: {
              name: params.domain,
            },
          },
        },
      },
      defaultSignalOpenstackOptions
    )
    const token = openstackSession.getToken()
    sessionCookie.set(token?.authToken)
    return openstackSession
  }

  // Rescope the current session, change project or domain
  const rescopeSession: AuroraPortalContext["rescopeSession"] = async (scope) => {
    if (!openstackSession) return null
    await openstackSession.rescope(scope)
    // Update the cookie with the new token
    sessionCookie.set(openstackSession.getToken()?.authToken)
    return openstackSession
  }

  // Terminate the current session (Logout)
  const terminateSession = async () => {
    if (openstackSession) {
      await openstackSession.terminate().finally(() => {
        openstackSession = undefined
        sessionCookie.del()
      })
    }
  }

  return {
    createSession,
    rescopeSession,
    terminateSession,
    validateSession,
    openstack: openstackSession,
  }
}

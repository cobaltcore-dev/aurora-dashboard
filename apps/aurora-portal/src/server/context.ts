import { AuroraContext, CreateAuroraFastifyContextOptions } from "@cobaltcore-dev/aurora-sdk/server"
import { AuroraSignalSession, AuroraSignalSessionType, AuthConfig } from "@cobaltcore-dev/aurora-signal"

import * as dotenv from "dotenv"

// Load the identity endpoint from the environment
dotenv.config()
const identityEndpoint = process.env.IDENTITY_ENDPOINT
// Ensure it ends with a single slash
const normalizedEndpoint = identityEndpoint?.endsWith("/") ? identityEndpoint : `${identityEndpoint}/`

export interface AuroraPortalContext extends AuroraContext {
  createSession: (params: { user: string; password: string; domain: string }) => AuroraSignalSessionType
  rescopeSession: (scope: AuthConfig["auth"]["scope"]) => Promise<Awaited<AuroraSignalSessionType | null>>
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
      })
    },
    get: () => opts.req.cookies[cookieName],

    del: () => {
      // Clear the cookie by setting an empty value and an immediate expiration date
      opts.res.setCookie(cookieName, "", {
        httpOnly: true, // Optional: to make it inaccessible via JavaScript
        secure: true, // Optional: set to true for HTTPS
        sameSite: "strict", // Optional: controls cross-site behavior
        expires: new Date(0), // Expire immediately
      })
    },
  }
}

export async function createContext(opts: CreateAuroraFastifyContextOptions): Promise<AuroraPortalContext> {
  const sessionCookie = SessionCookie("aurora-session", opts)
  const currentAuthToken = sessionCookie.get()
  let openstackSession: Awaited<AuroraSignalSessionType | null> = null

  // If we have a token, initialize the session
  if (currentAuthToken) {
    openstackSession = await AuroraSignalSession(normalizedEndpoint, {
      auth: {
        identity: {
          methods: ["token"],
          token: { id: currentAuthToken },
        },
      },
    })
  }

  // Create a new session (Login)
  const createSession: AuroraPortalContext["createSession"] = async (params) => {
    openstackSession = await AuroraSignalSession(normalizedEndpoint, {
      auth: {
        identity: {
          methods: ["password"],
          password: { user: { name: params.user, password: params.password, domain: { name: params.domain } } },
        },
      },
    })
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
      await openstackSession.terminate()
      openstackSession = null
    }
    sessionCookie.del()
  }

  return {
    createSession,
    rescopeSession,
    terminateSession,
    validateSession: () => {
      return openstackSession ? { openstack: openstackSession } : null
    },
  }
}

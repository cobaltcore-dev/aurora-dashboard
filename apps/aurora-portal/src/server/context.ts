import { AuroraContext, CreateAuroraFastifyContextOptions } from "@cobaltcore-dev/aurora-sdk/server"
import { AuroraSignalSession, AuthConfig } from "@cobaltcore-dev/aurora-signal"
import * as dotenv from "dotenv"

// Load the identity endpoint from the environment
dotenv.config()
const identityEndpoint = process.env.IDENTITY_ENDPOINT
// Ensure it ends with a single slash
const normalizedEndpoint = identityEndpoint?.endsWith("/") ? identityEndpoint : `${identityEndpoint}/`

type AuroraSignalSessionType = ReturnType<typeof AuroraSignalSession> | null

const SESSION_COOKIE_NAME = "aurora-session"

interface AuroraSessionType {
  openstack: AuroraSignalSessionType | null
}

export interface AuroraPortalContext extends AuroraContext {
  createSession: (
    params: { user: string; password: string; domain: string },
    scope?: AuthConfig["auth"]["scope"]
  ) => Promise<AuroraSessionType>
  terminateSession: () => Promise<void>
  rescopeSession: (scope: AuthConfig["auth"]["scope"]) => Promise<AuroraSessionType>
}

export async function createContext(opts: CreateAuroraFastifyContextOptions): Promise<AuroraPortalContext> {
  // Helper functions to set, delete, and validate the session cookie
  // setSessionCookie sets the session cookie with the provided token
  const setSessionCookie = (authToken: string | undefined, options?: { expires: Date }) => {
    if (!authToken) return
    opts.res.setCookie(SESSION_COOKIE_NAME, authToken, {
      secure: true,
      httpOnly: true,
      sameSite: "strict",
      expires: options?.expires || undefined,
    })
  }

  // deleteSessionCookie clears the session cookie
  const deleteSessionCookie = () => {
    // Clear the cookie by setting an empty value and an immediate expiration date
    opts.res.setCookie(SESSION_COOKIE_NAME, "", {
      httpOnly: true, // Optional: to make it inaccessible via JavaScript
      secure: true, // Optional: set to true for HTTPS
      sameSite: "strict", // Optional: controls cross-site behavior
      expires: new Date(0), // Expire immediately
    })
  }

  // Create the aurora signal session from the cookie
  let currentSession: AuroraSignalSessionType

  // Check if there is a session cookie and validate it
  // Returns the auroa signal session if the cookie is valid
  const validateSession = () => {
    const authToken = opts.req.cookies[SESSION_COOKIE_NAME]
    if (!authToken) {
      deleteSessionCookie()
      return { openstack: null }
    }

    currentSession =
      currentSession ||
      AuroraSignalSession(
        normalizedEndpoint,
        {
          auth: {
            identity: {
              methods: ["token"],
              token: { id: authToken },
            },
          },
        },
        { debug: true }
      )
    return { openstack: currentSession }
  }

  // public functions
  const createSession = async (
    params: { user: string; password: string; domain: string },
    scope?: AuthConfig["auth"]["scope"]
  ) => {
    currentSession = AuroraSignalSession(
      normalizedEndpoint,
      {
        auth: {
          identity: {
            methods: ["password"],
            password: {
              user: { name: params.user, domain: { name: params.domain }, password: params.password },
            },
          },
          scope,
        },
      },
      { debug: true }
    )

    const token = await currentSession.getToken()

    if (!token) {
      deleteSessionCookie()
      return { openstack: null }
    }
    setSessionCookie(token.authToken, { expires: token.expiresAtDate })
    return { openstack: currentSession }
  }

  const rescopeSession = async (scope: AuthConfig["auth"]["scope"]) => {
    const authToken = opts.req.cookies[SESSION_COOKIE_NAME]
    if (!authToken) {
      deleteSessionCookie()
      return { openstack: null }
    }
    currentSession = AuroraSignalSession(normalizedEndpoint, {
      auth: {
        identity: {
          methods: ["token"],
          token: { id: authToken },
        },
        scope,
      },
    })

    const token = await currentSession.getToken()
    if (!token) {
      deleteSessionCookie()
      return { openstack: null }
    }
    setSessionCookie(token.authToken, { expires: token.expiresAtDate })
    return { openstack: currentSession }
  }

  const terminateSession = async () => {
    currentSession?.terminate()
    currentSession = null
    deleteSessionCookie()
  }

  // expose the public functions
  return {
    createSession,
    terminateSession,
    rescopeSession,
    validateSession,
  }
}

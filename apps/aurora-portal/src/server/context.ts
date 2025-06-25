import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"
import { SignalOpenstackSession, SignalOpenstackSessionType } from "@cobaltcore-dev/signal-openstack"
import { SessionCookie } from "./sessionCookie"
import * as dotenv from "dotenv"
import { AuthConfig } from "./Authentication/types/models"

export interface AuroraContext {
  validateSession: () => boolean
  openstack?: Awaited<SignalOpenstackSessionType>
}

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
  rescopeSession: (scope: {
    projectId?: string
    domainId?: string
  }) => Promise<Awaited<SignalOpenstackSessionType | null>>
  terminateSession: () => Promise<void>
}

export async function createContext(opts: CreateFastifyContextOptions): Promise<AuroraPortalContext> {
  const sessionCookie = SessionCookie({ req: opts.req, res: opts.res })
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
  // This is how Openstack handles switching between projects
  // the auth token should always be scoped to a project or domain to access resources
  const rescopeSession: AuroraPortalContext["rescopeSession"] = async (scope) => {
    if (!openstackSession) return null
    const token = openstackSession.getToken()
    const currentScopeDomainId = token?.tokenData.domain?.id
    const currentScopeProjectId = token?.tokenData.project?.id
    const newScopeDomainId = scope.domainId
    const newScopeProjectId = scope.projectId
    //check if newScope differs from currentScope
    if (currentScopeDomainId === newScopeDomainId && currentScopeProjectId === newScopeProjectId) {
      return openstackSession
    }

    const newScope: AuthConfig["auth"]["scope"] = newScopeProjectId
      ? { project: { id: newScopeProjectId } }
      : newScopeDomainId
        ? { domain: { id: newScopeDomainId } }
        : "unscoped"

    await openstackSession.rescope(newScope)
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

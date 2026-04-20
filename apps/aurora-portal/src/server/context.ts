import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"
import { SignalOpenstackSession, SignalOpenstackSessionType } from "@cobaltcore-dev/signal-openstack"
import { SessionCookie } from "./sessionCookie"
import * as dotenv from "dotenv"
import { AuthConfig } from "./Authentication/types/models"

export interface AuroraContext {
  validateSession: () => boolean
  openstack?: Awaited<SignalOpenstackSessionType>
  // Lazy-loaded user information extracted from the OpenStack token
  // Only fetched when needed (e.g., by domainScopedProcedure)
  // Call this function to get user info on-demand
  getUserInfo?: () => Promise<
    | {
        // List of domains accessible to the user (from /v3/auth/domains)
        // Used by domainScopedProcedure to validate domain access
        availableDomains: Array<{ id: string; name: string }>
      }
    | undefined
  >
}

// Load the identity endpoint from the environment
dotenv.config()
const identityEndpoint = process.env.IDENTITY_ENDPOINT
// Ensure it ends with a single slash
const normalizedEndpoint = identityEndpoint?.endsWith("/") ? identityEndpoint : `${identityEndpoint}/`
const defaultSignalOpenstackOptions = {
  interfaceName: process.env.DEFAULT_ENDPOINT_INTERFACE || "public",
  debug: process.env.NODE_ENV !== "production",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
}

// Global registry of pending rescope operations per session
// This is shared across all requests and prevents race conditions between concurrent requests
// Key: authToken (session identifier)
// Value: Map of pending rescope token promises keyed by scope (e.g., "project:{id}")
//
// IMPORTANT: We cache only the rescoped auth token STRING (immutable data), not the
// SignalOpenstackSession instances. This prevents race conditions where concurrent
// requests would share the same session/cookie objects.
//
// How it works:
// 1. First request creates a Promise that fetches the token from Keystone
// 2. Concurrent requests reuse this Promise to get the same token (deduplication)
// 3. Each request applies the token to its own openstackSession and sessionCookie
// 4. This ensures each HTTP response gets the correct Set-Cookie header
const sessionRescopes = new Map<string, Map<string, Promise<string | null>>>()

export interface FilePartData {
  filename: string
  mimetype: string
  encoding: string
  file: NodeJS.ReadableStream
}

export interface FormFieldData {
  [key: string]: string | string[]
}

export interface AuroraPortalContext extends AuroraContext {
  createSession: (params: { user: string; password: string; domain: string }) => SignalOpenstackSessionType
  rescopeSession: (scope: {
    projectId?: string
    domainId?: string
  }) => Promise<Awaited<SignalOpenstackSessionType | null>>
  terminateSession: () => Promise<void>
  // Stream-based multipart data
  getMultipartData: () => AsyncGenerator<
    | { type: "field"; fieldname: string; value: string }
    | { type: "file"; filename: string; mimetype: string; encoding: string; file: NodeJS.ReadableStream },
    void,
    unknown
  >
  formFields?: FormFieldData
  uploadedFileStream?: FilePartData
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
    ).catch((err: Error) => {
      // If the token is invalid, clear the cookie
      console.error("[createContext] Token validation failed:", err.message)
      sessionCookie.del()
      return undefined
    })
  }

  const validateSession = () => openstackSession?.isValid() || false

  // Cache for user info to avoid repeated API calls
  let cachedUserInfo: { availableDomains: Array<{ id: string; name: string }> } | undefined
  let cachedUserId: string | undefined

  // Get list of domains accessible to the user
  // This is used by domainScopedProcedure to validate domain access
  // We don't check for specific roles - Keystone will enforce permissions when rescoping
  const getUserInfo = async () => {
    const token = openstackSession?.getToken()
    if (!token) {
      return undefined
    }

    const userId = token.tokenData.user?.id
    if (!userId) {
      return undefined
    }

    // Return cached result if we've already fetched for this user
    if (cachedUserId === userId && cachedUserInfo) {
      return cachedUserInfo
    }

    try {
      // Use /v3/auth/domains to discover domains accessible to the user
      // This endpoint doesn't require special permissions and returns domains
      // where the user has any role assignment
      const identityService = openstackSession?.service("identity")
      if (!identityService) {
        return undefined
      }

      // GET /v3/auth/domains - returns domains accessible to the current user
      const domainsResponse = await identityService.get("auth/domains", {
        headers: {
          Accept: "application/json",
        },
      })

      const domainsData = await domainsResponse.json()
      const domains = domainsData?.domains || []

      const availableDomains: Array<{ id: string; name: string }> = domains.map(
        (domain: { id: string; name: string }) => ({
          id: domain.id,
          name: domain.name || "",
        })
      )

      // Cache the result
      cachedUserId = userId
      cachedUserInfo = { availableDomains }

      return cachedUserInfo
    } catch (err) {
      console.error("Error fetching accessible domains:", err)
      // Return undefined to signal that we couldn't fetch domain info
      // domainScopedProcedure will treat this as "cannot verify access"
      // and deny the request, which is safer than allowing access on error
      return undefined
    }
  }

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
    const sessionToken = token?.authToken
    if (!sessionToken) return null

    // Check if newScope differs from currentScope (no-op rescope check)
    // Do this early to avoid unnecessary map operations
    const currentScopeDomainId = token?.tokenData.domain?.id
    const currentScopeProjectId = token?.tokenData.project?.id
    const newScopeDomainId = scope.domainId
    const newScopeProjectId = scope.projectId

    if (currentScopeDomainId === newScopeDomainId && currentScopeProjectId === newScopeProjectId) {
      return openstackSession
    }

    // Get or create the session-scoped pending rescopes map atomically
    // This ensures that concurrent requests from the same session coordinate their rescopes
    let pendingRescopes = sessionRescopes.get(sessionToken)
    if (!pendingRescopes) {
      pendingRescopes = new Map()
      sessionRescopes.set(sessionToken, pendingRescopes)
    }

    // Generate a unique key for this scope to detect concurrent rescope requests
    const scopeKey = scope.projectId
      ? `project:${scope.projectId}`
      : scope.domainId
        ? `domain:${scope.domainId}`
        : "unscoped"

    // If there's already a pending rescope for this exact scope, reuse it
    // This prevents multiple Keystone API calls for the same scope across concurrent requests
    if (pendingRescopes.has(scopeKey)) {
      const cachedTokenPromise = pendingRescopes.get(scopeKey)!

      // Wait for the token from the shared promise
      const newAuthToken = await cachedTokenPromise

      if (!newAuthToken) {
        return null
      }

      // Rescope THIS request's openstackSession with the cached token
      const newScope: AuthConfig["auth"]["scope"] = newScopeProjectId
        ? { project: { id: newScopeProjectId } }
        : newScopeDomainId
          ? { domain: { id: newScopeDomainId } }
          : "unscoped"

      await openstackSession.rescope(newScope)

      // Apply the token to THIS request's cookie only after successful rescope
      sessionCookie.set(newAuthToken)

      return openstackSession
    }

    // Create the rescope promise that returns only the token string (immutable)
    const rescopeTokenPromise = (async (): Promise<string | null> => {
      try {
        const newScope: AuthConfig["auth"]["scope"] = newScopeProjectId
          ? { project: { id: newScopeProjectId } }
          : newScopeDomainId
            ? { domain: { id: newScopeDomainId } }
            : "unscoped"

        await openstackSession.rescope(newScope)

        // Get the new token after rescoping
        const newToken = openstackSession.getToken()
        const newAuthToken = newToken?.authToken

        // If the auth token changed, we need to migrate the pending rescopes to the new token
        if (newAuthToken && newAuthToken !== sessionToken) {
          const oldPendingRescopes = sessionRescopes.get(sessionToken)
          if (oldPendingRescopes) {
            // Check if there's already a map under the new token (from concurrent requests)
            const existingRescopes = sessionRescopes.get(newAuthToken)
            if (existingRescopes) {
              // Merge oldPendingRescopes into existing map to avoid overwriting
              for (const [key, value] of oldPendingRescopes.entries()) {
                if (!existingRescopes.has(key)) {
                  existingRescopes.set(key, value)
                }
              }
            } else {
              // No existing map, safe to move the old one
              sessionRescopes.set(newAuthToken, oldPendingRescopes)
            }
            sessionRescopes.delete(sessionToken)
          }
        }

        // Invalidate user info cache since role assignments may differ with new scope
        cachedUserId = undefined
        cachedUserInfo = undefined

        // Return only the token string, not the session object
        return newAuthToken || null
      } catch (err) {
        console.error("Rescope error:", err)
        // Return null on any rescope error (network failure, invalid scope, insufficient permissions)
        // The caller (projectScopedProcedure/domainScopedProcedure) will handle this by throwing TRPCError
        return null
      } finally {
        // Clean up the pending rescope entry once complete (success or failure)
        pendingRescopes.delete(scopeKey)

        // Clean up empty session maps to prevent memory leaks
        if (pendingRescopes.size === 0) {
          sessionRescopes.delete(sessionToken)
          // Also check if we moved to a new token
          const currentToken = openstackSession?.getToken()?.authToken
          if (currentToken && currentToken !== sessionToken && sessionRescopes.get(currentToken)?.size === 0) {
            sessionRescopes.delete(currentToken)
          }
        }
      }
    })()

    // Store the promise before awaiting to handle concurrent requests
    pendingRescopes.set(scopeKey, rescopeTokenPromise)

    // Wait for the token
    const newAuthToken = await rescopeTokenPromise

    if (!newAuthToken) {
      return null
    }

    // Apply the token to THIS request's session and cookie
    sessionCookie.set(newAuthToken)

    return openstackSession
  }

  // Terminate the current session (Logout)
  const terminateSession = async () => {
    if (openstackSession) {
      const token = openstackSession.getToken()?.authToken
      await openstackSession.terminate().finally(() => {
        openstackSession = undefined
        sessionCookie.del()
        // Clean up the session's pending rescopes on logout
        if (token) {
          sessionRescopes.delete(token)
        }
      })
    }
  }

  // Lazy multipart parsing - returns async generator
  // This allows consuming parts on-demand without buffering
  // TODO: Add first-class support for multipart/form-data requests, enabling FormData inputs (e.g., for file uploads)
  // to be passed through and processed reliably with Fastify-based servers.
  // fix(server): fastify form-data type #6974: https://github.com/trpc/trpc/pull/6974
  // https://github.com/trpc/trpc/releases/tag/v11.8.1
  const getMultipartData = async function* () {
    const contentType = opts.req.headers["content-type"] || ""

    // Only parse multipart if content-type indicates it
    if (!contentType.includes("multipart")) {
      return
    }

    // Iterate through all parts of the multipart request
    for await (const part of opts.req.parts()) {
      if (part.type === "field") {
        yield {
          type: "field" as const,
          fieldname: part.fieldname,
          value: String(part.value), // Cast unknown to string
        }
      } else if (part.type === "file") {
        yield {
          type: "file" as const,
          filename: part.filename,
          mimetype: part.mimetype,
          encoding: part.encoding,
          file: part.file as NodeJS.ReadableStream, // Cast BusboyFileStream to NodeJS.ReadableStream
        }
      }
    }
  }

  return {
    createSession,
    rescopeSession,
    terminateSession,
    validateSession,
    openstack: openstackSession,
    getMultipartData,
    getUserInfo,
  }
}

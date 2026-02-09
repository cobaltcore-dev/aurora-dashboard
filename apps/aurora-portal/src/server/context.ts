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
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
}

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
  }
}

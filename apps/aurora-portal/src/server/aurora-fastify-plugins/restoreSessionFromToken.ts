import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify"
import { SessionCookie } from "../sessionCookie"

// Define the schema for request validation
const restoreSessionSchema = {
  body: {
    type: "object",
    required: ["authToken"],
    properties: {
      authToken: {
        type: "string",
        minLength: 1,
        description: "The authentication token to restore session from",
      },
      redirectUrl: {
        type: "string",
        default: "/",
        description: "URL to redirect to after successful session restoration",
      },
    },
    additionalProperties: false,
  },
  response: {
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
      },
    },
    302: {
      description: "Redirect response after successful session restoration",
    },
  },
}

// Plugin options interface
export interface SessionRestorationPluginOptions {
  route?: string
}

// Route handler function
async function restoreSessionFromTokenHandler(req: FastifyRequest, res: FastifyReply) {
  const body = req.body as { authToken: string; redirectUrl?: string }
  const { authToken, redirectUrl = "/" } = body

  const sessionCookie = SessionCookie({ req, res })
  if (!authToken || authToken.length === 0 || typeof authToken !== "string") {
    return res.status(400).send({ error: "authToken is required and cannot be empty" })
  }
  sessionCookie.set(authToken)
  res.redirect(redirectUrl)
}

// Main plugin function
const sessionRestorationPlugin: FastifyPluginAsync<SessionRestorationPluginOptions> = async (fastify, options) => {
  const { route = "/restore-session" } = options

  // Register POST route with schema validation
  fastify.post(route, { schema: restoreSessionSchema }, restoreSessionFromTokenHandler)
}

export default sessionRestorationPlugin

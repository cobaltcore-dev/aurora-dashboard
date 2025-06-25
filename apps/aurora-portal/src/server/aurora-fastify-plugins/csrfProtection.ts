import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify"
import FastifyCsrfProtection from "@fastify/csrf-protection"
import fp from "fastify-plugin"

// Plugin options interface
interface CsrfPluginOptions {
  tokenRoute?: string
  cookieKey?: string
  tokenHeader?: string
  excludePaths?: string[]
  protectionMethods?: string[]
}

// Define the response schema for token endpoint
const csrfTokenSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        csrfToken: {
          type: "string",
          description: "CSRF token for form submissions",
        },
      },
      required: ["csrfToken"],
    },
  },
} as const

// CSRF token endpoint handler
async function csrfTokenHandler(req: FastifyRequest, res: FastifyReply) {
  const csrfToken = res.generateCsrf()
  return { csrfToken }
}

// CSRF validation hook
async function csrfValidationHook(
  request: FastifyRequest,
  reply: FastifyReply,
  excludePaths: string[],
  methods: string[]
) {
  // Check if request method requires CSRF validation
  if (!methods.includes(request.method)) {
    return
  }

  // Check if the URL should be excluded from CSRF validation
  const isExcluded = excludePaths.some((path) => request.url.startsWith(path))
  if (isExcluded) {
    return
  }

  // Perform CSRF validation
  const server = request.server
  return server.csrfProtection(request, reply, () => {
    // Validation passes, request continues
  })
}

// Main CSRF plugin
const csrfPlugin: FastifyPluginAsync<CsrfPluginOptions> = async (fastify, options) => {
  const {
    tokenRoute = "/csrf-token",
    cookieKey = "aurora-csrf-protection",
    tokenHeader = "x-csrf-token",
    excludePaths = ["/extensions"],
    protectionMethods = ["POST", "PUT", "DELETE", "PATCH"],
  } = options

  // Register FastifyCsrfProtection first
  await fastify.register(FastifyCsrfProtection, {
    cookieKey,
    getToken: (request) => {
      // Extract CSRF token from custom header
      const token = request.headers[tokenHeader.toLowerCase()]
      return Array.isArray(token) ? token[0] : token
    },
  })

  // Register the CSRF token endpoint
  await fastify.get(tokenRoute, { schema: csrfTokenSchema }, csrfTokenHandler)
  //Add preHandler hook for CSRF validation on mutating requests
  await fastify.addHook("preHandler", async (request, reply) => {
    return await csrfValidationHook(request, reply, excludePaths, protectionMethods)
  })
}

// Export with fastify-plugin to avoid encapsulation
// Otherwise, the CSRF protection would not work across routes
// because it would be encapsulated within the plugin scope
export default fp(csrfPlugin, {
  name: "csrf-plugin",
  fastify: "5.x",
})

// Export types for external use
export type { CsrfPluginOptions }

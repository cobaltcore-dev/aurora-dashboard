import { IncomingMessage, ServerResponse } from "node:http"
import { appRouter } from "../bff/routers"
import { createHTTPHandler } from "@trpc/server/adapters/standalone"
export { App } from "../client/App"

const handler = createHTTPHandler({
  router: appRouter,
  createContext: async ({ req, res }) => {
    // Define and return the context object here
    return {
      validateSession: () => true, // Example implementation
      openstack: undefined, // Provide a valid value if needed
    }
  },
})

export function handleRequest(req: IncomingMessage, res: ServerResponse) {
  return handler(req, res)
}

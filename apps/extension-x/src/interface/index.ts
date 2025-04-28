import { IncomingMessage, ServerResponse } from "node:http"
import { appRouter } from "../bff/routers"

import { createHTTPHandler } from "@trpc/server/adapters/standalone"

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

export function mountUI(container: HTMLElement, props: object) {
  const app = document.createElement("div")
  app.id = "aurora-extension-x"
  container.appendChild(app)
  // Here you would typically mount your UI framework (React, Vue, etc.) to the app element
}

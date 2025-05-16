import { IncomingMessage, ServerResponse } from "node:http"
import { appRouter } from "../server/routers"
import { createHTTPHandler } from "@trpc/server/adapters/standalone"

const handler = createHTTPHandler({
  router: appRouter,
  createContext: async ({ req, res }) => {
    const context: AppContext = {}
    const extensionContext = res.getHeader("extension-context")
    if (extensionContext) {
      try {
        Object.assign(context, JSON.parse(extensionContext as string))
      } catch (e) {
        console.error("Failed to parse extension context:", e)
      }
    }
    return context
  },
})

export function handleRequest(req: IncomingMessage, res: ServerResponse, context?: AppContext) {
  if (context) res.setHeader("extension-context", JSON.stringify(context))
  return handler(req, res)
}

export type AppContext = Record<string, string | number | boolean | undefined>

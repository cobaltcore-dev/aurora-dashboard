import { appRouter } from "./routers"
import { IncomingMessage, ServerResponse } from "node:http"
import { createHTTPHandler } from "@trpc/server/adapters/standalone"
import { RegisterServerFunction, ServerConfig } from "@cobaltcore-dev/extension-sdk"

export type { AppRouter } from "./routers"

export type AppContext = Record<string, string | number | boolean | undefined>

const registerServer: RegisterServerFunction<AppContext> = (config?: ServerConfig) => {
  const mountPath = config?.mountRoute || ""
  const path = `${mountPath}/_bff`

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

  // Fix: Use Context type instead of AppContext
  const handleRequest = (req: IncomingMessage, res: ServerResponse, context?: AppContext) => {
    if (context) res.setHeader("extension-context", JSON.stringify(context))
    return handler(req, res)
  }

  return {
    handleRequest,
    path,
  }
}

export { registerServer }

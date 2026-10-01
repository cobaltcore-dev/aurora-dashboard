import type { AnyRouter } from "@trpc/server"
import { auroraRouter } from "@cobaltcore-dev/aurora/server"
import { keyManagerRouter } from "./router.js"
import { buildKeyManagerPermissionRouter } from "./permissionRouter.js"

export interface KeyManagerPluginOptions {
  policyDir?: string
}

export function registerRouter(options: KeyManagerPluginOptions = {}): { appRouter: AnyRouter } {
  const procedures: Record<string, unknown> = { ...keyManagerRouter }

  if (options.policyDir) {
    const permissionRouter = buildKeyManagerPermissionRouter(options.policyDir)
    Object.assign(procedures, permissionRouter)
  }

  return {
    appRouter: auroraRouter({
      keyManager: auroraRouter(procedures as typeof keyManagerRouter),
    }),
  }
}

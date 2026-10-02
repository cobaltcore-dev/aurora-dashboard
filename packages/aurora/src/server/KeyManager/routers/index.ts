import { keyManagerRouter } from "./keyManagerRouter"
import { buildKeyManagerPermissionRouter } from "./permissionRouter"
import { auroraRouter } from "../../trpc"

export const buildKeyManagerRouters = (policyDir: string) => ({
  keyManager: auroraRouter({
    ...keyManagerRouter,
    ...buildKeyManagerPermissionRouter(policyDir),
  }),
})

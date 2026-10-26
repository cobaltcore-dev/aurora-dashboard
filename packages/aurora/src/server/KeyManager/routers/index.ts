import { buildKeyManagerResourceRouter } from "./keyManagerRouter"
import { buildKeyManagerPermissionRouter } from "./permissionRouter"
import { auroraRouter } from "../../trpc"

export const buildKeyManagerRouters = (policyDir: string) => ({
  keyManager: auroraRouter({
    ...buildKeyManagerResourceRouter(policyDir),
    ...buildKeyManagerPermissionRouter(policyDir),
  }),
})

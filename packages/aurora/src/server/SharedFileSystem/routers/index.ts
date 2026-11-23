import { auroraRouter } from "../../trpc"
import { createSharedFileSystemPermissionCheck } from "../helpers/permissions"
import { buildSharedFileSystemPermissionRouter } from "./permissionRouter"

// Later tickets will spread their resource routers here and reuse the check
export const buildSharedFileSystemRouters = (policyDir: string) => {
  const check = createSharedFileSystemPermissionCheck(policyDir)
  return {
    sharedFileSystem: auroraRouter({
      ...buildSharedFileSystemPermissionRouter(check),
    }),
  }
}

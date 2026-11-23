import { auroraRouter } from "../../trpc"
import { createSharedFileSystemPermissionCheck } from "../helpers/permissions"
import { buildSharedFileSystemPermissionRouter } from "./permissionRouter"
import { buildShareResourceRouter } from "./shareRouter"
import { buildShareSnapshotResourceRouter } from "./snapshotRouter"
import { buildShareReplicaResourceRouter } from "./replicaRouter"
import { buildShareNetworkResourceRouter } from "./shareNetworkRouter"
import { buildSecurityServiceResourceRouter } from "./securityServiceRouter"

export const buildSharedFileSystemRouters = (policyDir: string) => {
  const check = createSharedFileSystemPermissionCheck(policyDir)
  return {
    sharedFileSystem: auroraRouter({
      ...buildSharedFileSystemPermissionRouter(check),
      ...buildShareResourceRouter(check),
      ...buildShareSnapshotResourceRouter(check),
      ...buildShareReplicaResourceRouter(check),
      ...buildShareNetworkResourceRouter(check),
      ...buildSecurityServiceResourceRouter(check),
    }),
  }
}

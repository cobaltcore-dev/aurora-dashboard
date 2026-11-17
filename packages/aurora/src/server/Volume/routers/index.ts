import { auroraRouter } from "../../trpc"
import { createVolumePermissionCheck } from "../helpers/permissions"
import { buildVolumePermissionRouter } from "./permissionRouter"
import { buildVolumeResourceRouter } from "./volumeRouter"
import { buildSnapshotResourceRouter } from "./snapshotRouter"

export const buildVolumeRouters = (policyDir: string) => {
  const check = createVolumePermissionCheck(policyDir)
  return {
    volume: auroraRouter({
      ...buildVolumePermissionRouter(check),
      ...buildVolumeResourceRouter(check),
      ...buildSnapshotResourceRouter(check),
    }),
  }
}

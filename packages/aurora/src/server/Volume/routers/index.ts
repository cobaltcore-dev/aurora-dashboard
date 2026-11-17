import { auroraRouter } from "../../trpc"
import { createVolumePermissionCheck } from "../helpers/permissions"
import { buildVolumePermissionRouter } from "./permissionRouter"
import { buildVolumeResourceRouter } from "./volumeRouter"
import { buildSnapshotResourceRouter } from "./snapshotRouter"
import { volumeAvailabilityRouter } from "./availabilityRouter"

export const buildVolumeRouters = (policyDir: string) => {
  const check = createVolumePermissionCheck(policyDir)
  return {
    volume: auroraRouter({
      ...volumeAvailabilityRouter,
      ...buildVolumePermissionRouter(check),
      ...buildVolumeResourceRouter(check),
      ...buildSnapshotResourceRouter(check),
    }),
  }
}

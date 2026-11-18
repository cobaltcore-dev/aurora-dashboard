import { z } from "zod"
import { projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { VOLUME_PERMISSIONS } from "@/types/volume"
import type { VolumePermissionCheck } from "../helpers/permissions"

const permissionSchema = z.enum(VOLUME_PERMISSIONS)
export const buildVolumePermissionRouter = (check: VolumePermissionCheck) => ({
  canUser: projectScopedProcedure
    .input(
      projectScopedInputSchema.extend({
        permission: z.union([permissionSchema, z.array(permissionSchema)]),
      })
    )
    .query(({ ctx, input }) => {
      const permissions = Array.isArray(input.permission) ? input.permission : [input.permission]
      return permissions.map((permission) => check(ctx, permission))
    }),
})

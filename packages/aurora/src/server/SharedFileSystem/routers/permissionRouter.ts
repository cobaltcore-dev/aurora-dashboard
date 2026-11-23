import { z } from "zod"
import { projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { SHARED_FILE_SYSTEM_PERMISSIONS } from "@/types/sharedFileSystem"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"

const permissionSchema = z.enum(SHARED_FILE_SYSTEM_PERMISSIONS)
export const buildSharedFileSystemPermissionRouter = (check: SharedFileSystemPermissionCheck) => ({
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

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { volumeSchema, volumeIdInputSchema } from "../types/volume"
import { getVolumeService, readVolumeResponse, listVolumeResources, assertResourceProject } from "../helpers/request"
import type { VolumePermissionCheck } from "../helpers/permissions"

export const buildVolumeResourceRouter = (check: VolumePermissionCheck) => ({
  listVolumes: projectScopedProcedure.input(projectScopedInputSchema).query(async ({ ctx }) => {
    if (!check(ctx, "volume:volumes:list")) throw new TRPCError({ code: "FORBIDDEN" })
    return listVolumeResources(ctx, "volumes", volumeSchema)
  }),
  getVolumeById: projectScopedProcedure.input(volumeIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "volume:volumes:read")) throw new TRPCError({ code: "FORBIDDEN" })
    const { volume } = await readVolumeResponse(
      ctx,
      getVolumeService(ctx),
      `volumes/${input.volumeId}`,
      z.object({ volume: volumeSchema })
    )
    assertResourceProject(ctx, volume["os-vol-tenant-attr:tenant_id"])
    return volume
  }),
})

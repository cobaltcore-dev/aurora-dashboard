import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { shareSchema, shareIdInputSchema, exportLocationSchema } from "../types/share"
import { getManilaService, readManila, listManila, keepProjectItems, readOwnedShare } from "../helpers/request"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"

export const buildShareResourceRouter = (check: SharedFileSystemPermissionCheck) => ({
  listShares: projectScopedProcedure.input(projectScopedInputSchema).query(async ({ ctx }) => {
    if (!check(ctx, "shared-file-system:shares:list")) throw new TRPCError({ code: "FORBIDDEN" })
    return keepProjectItems(ctx, await listManila(ctx, "shares", "shares", shareSchema))
  }),
  getShareById: projectScopedProcedure.input(shareIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:shares:read")) throw new TRPCError({ code: "FORBIDDEN" })
    return readOwnedShare(ctx, check, input.shareId)
  }),
  getShareExportLocations: projectScopedProcedure.input(shareIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:export_locations:list")) throw new TRPCError({ code: "FORBIDDEN" })
    await readOwnedShare(ctx, check, input.shareId)
    const { export_locations } = await readManila(
      ctx,
      getManilaService(ctx),
      `shares/${input.shareId}/export_locations`,
      z.object({ export_locations: z.array(exportLocationSchema) })
    )
    return export_locations
  }),
})

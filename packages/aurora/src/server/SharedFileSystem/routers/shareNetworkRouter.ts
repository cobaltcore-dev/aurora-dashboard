import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { shareNetworkSchema, shareNetworkIdInputSchema } from "../types/shareNetwork"
import { getManilaService, readManila, listManila, keepProjectItems, assertProjectOwnership } from "../helpers/request"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"

export const buildShareNetworkResourceRouter = (check: SharedFileSystemPermissionCheck) => ({
  listShareNetworks: projectScopedProcedure.input(projectScopedInputSchema).query(async ({ ctx }) => {
    if (!check(ctx, "shared-file-system:share_networks:list")) throw new TRPCError({ code: "FORBIDDEN" })
    return keepProjectItems(ctx, await listManila(ctx, "share-networks", "share_networks", shareNetworkSchema))
  }),
  getShareNetworkById: projectScopedProcedure.input(shareNetworkIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:share_networks:read")) throw new TRPCError({ code: "FORBIDDEN" })
    const { share_network } = await readManila(
      ctx,
      getManilaService(ctx),
      `share-networks/${input.shareNetworkId}`,
      z.object({ share_network: shareNetworkSchema })
    )
    await assertProjectOwnership(ctx, share_network.project_id, async () => {
      if (!check(ctx, "shared-file-system:share_networks:list")) return false
      const networks = await listManila(ctx, "share-networks", "share_networks", shareNetworkSchema)
      return networks.some((item) => item.id === share_network.id)
    })
    return share_network
  }),
})

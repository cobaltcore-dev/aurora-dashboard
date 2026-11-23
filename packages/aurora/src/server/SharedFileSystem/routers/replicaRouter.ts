import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../../trpc"
import { shareReplicaSchema, shareIdInputSchema } from "../types/share"
import { listManila, readOwnedShare } from "../helpers/request"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"

export const buildShareReplicaResourceRouter = (check: SharedFileSystemPermissionCheck) => ({
  listReplicas: projectScopedProcedure.input(shareIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:replicas:list")) throw new TRPCError({ code: "FORBIDDEN" })
    await readOwnedShare(ctx, check, input.shareId)
    const replicas = await listManila(ctx, "share-replicas", "share_replicas", shareReplicaSchema, {
      share_id: input.shareId,
    })
    // Defense against a deployment silently ignoring a filter: never display unrelated replicas.
    return replicas.filter((replica) => replica.share_id === input.shareId)
  }),
})

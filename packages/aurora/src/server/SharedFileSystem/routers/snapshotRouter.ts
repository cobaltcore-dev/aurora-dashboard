import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../../trpc"
import { shareSnapshotSchema, listShareSnapshotsInputSchema, shareSnapshotIdInputSchema } from "../types/snapshot"
import { getManilaService, readManila, listManila, keepProjectItems, assertProjectOwnership } from "../helpers/request"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"

export const buildShareSnapshotResourceRouter = (check: SharedFileSystemPermissionCheck) => ({
  listSnapshots: projectScopedProcedure.input(listShareSnapshotsInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:snapshots:list")) throw new TRPCError({ code: "FORBIDDEN" })
    const snapshots = await listManila(
      ctx,
      "snapshots",
      "snapshots",
      shareSnapshotSchema,
      input.shareId ? { share_id: input.shareId } : undefined
    )
    const filtered = keepProjectItems(ctx, snapshots)
    // Defense against a deployment silently ignoring a filter: never display unrelated snapshots.
    return input.shareId ? filtered.filter((snapshot) => snapshot.share_id === input.shareId) : filtered
  }),
  getSnapshotById: projectScopedProcedure.input(shareSnapshotIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "shared-file-system:snapshots:read")) throw new TRPCError({ code: "FORBIDDEN" })
    const { snapshot } = await readManila(
      ctx,
      getManilaService(ctx),
      `snapshots/${input.snapshotId}`,
      z.object({ snapshot: shareSnapshotSchema })
    )
    await assertProjectOwnership(ctx, snapshot.project_id, async () => {
      if (!check(ctx, "shared-file-system:snapshots:list")) return false
      const snapshots = await listManila(ctx, "snapshots", "snapshots", shareSnapshotSchema)
      return snapshots.some((item) => item.id === snapshot.id)
    })
    return snapshot
  }),
})

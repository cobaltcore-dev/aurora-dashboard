import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../../trpc"
import { snapshotSchema, listSnapshotsInputSchema, snapshotIdInputSchema } from "../types/snapshot"
import { getVolumeService, readVolumeResponse, listVolumeResources, assertResourceProject } from "../helpers/request"
import type { VolumePermissionCheck } from "../helpers/permissions"

export const buildSnapshotResourceRouter = (check: VolumePermissionCheck) => ({
  listSnapshots: projectScopedProcedure.input(listSnapshotsInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "volume:snapshots:list")) throw new TRPCError({ code: "FORBIDDEN" })
    const snapshots = await listVolumeResources(ctx, "snapshots", snapshotSchema, input.volumeId)
    // Defense against a deployment silently ignoring a filter: never display unrelated snapshots.
    return input.volumeId ? snapshots.filter((snapshot) => snapshot.volume_id === input.volumeId) : snapshots
  }),
  getSnapshotById: projectScopedProcedure.input(snapshotIdInputSchema).query(async ({ ctx, input }) => {
    if (!check(ctx, "volume:snapshots:read")) throw new TRPCError({ code: "FORBIDDEN" })
    const { snapshot } = await readVolumeResponse(
      ctx,
      getVolumeService(ctx),
      `snapshots/${input.snapshotId}`,
      z.object({ snapshot: snapshotSchema })
    )
    assertResourceProject(ctx, snapshot["os-extended-snapshot-attributes:project_id"])
    return snapshot
  }),
})

import { describe, it, expect } from "vitest"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { setupManila, SNAPSHOT_ID, SHARE_ID, OTHER_PROJECT } from "./mockContext"

describe("snapshotRouter", () => {
  describe("listSnapshots", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshots: [] }))
      await h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1" })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:snapshots:list")
    })

    it("sends the correct path and microversion header", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshots: [] }))
      await h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1" })
      expect(h.get).toHaveBeenCalledWith(
        "snapshots/detail",
        expect.objectContaining({
          headers: { "X-OpenStack-Manila-API-Version": "2.65" },
        })
      )
    })

    it("sends share_id query parameter when provided", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshots: [] }))
      await h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1", shareId: SHARE_ID })
      expect(h.get).toHaveBeenCalledWith(
        "snapshots/detail",
        expect.objectContaining({
          queryParams: { share_id: SHARE_ID },
        })
      )
    })

    it("does not send query params when shareId is omitted", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshots: [] }))
      await h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1" })
      expect(h.get).toHaveBeenCalledWith(
        "snapshots/detail",
        expect.not.objectContaining({ queryParams: expect.anything() })
      )
    })

    it("filters out snapshots from other projects", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          snapshots: [
            { id: "snap-1", project_id: "project-1", share_id: SHARE_ID },
            { id: "snap-2", project_id: OTHER_PROJECT, share_id: SHARE_ID },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1", shareId: SHARE_ID })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("snap-1")
    })

    it("filters out snapshots with different share_id when shareId is provided", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          snapshots: [
            { id: "snap-1", project_id: "project-1", share_id: SHARE_ID },
            { id: "snap-2", project_id: "project-1", share_id: "other-share" },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1", shareId: SHARE_ID })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("snap-1")
    })

    it("rejects invalid shareId UUID", async () => {
      const h = setupManila()
      await expect(
        h.caller.sharedFileSystem.listSnapshots({ project_id: "project-1", shareId: "../other" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(h.get).not.toHaveBeenCalled()
    })
  })

  describe("getSnapshotById", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(
        h.caller.sharedFileSystem.getSnapshotById({ project_id: "project-1", snapshotId: SNAPSHOT_ID })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshot: { id: SNAPSHOT_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getSnapshotById({ project_id: "project-1", snapshotId: SNAPSHOT_ID })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:snapshots:read")
    })

    it("sends the correct path", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshot: { id: SNAPSHOT_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getSnapshotById({ project_id: "project-1", snapshotId: SNAPSHOT_ID })
      expect(h.get).toHaveBeenCalledWith(`snapshots/${SNAPSHOT_ID}`, expect.anything())
    })

    it("rejects invalid UUID", async () => {
      const h = setupManila()
      await expect(
        h.caller.sharedFileSystem.getSnapshotById({ project_id: "project-1", snapshotId: "../other" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("returns snapshot when project_id matches", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshot: { id: SNAPSHOT_ID, project_id: "project-1" } }))
      const result = await h.caller.sharedFileSystem.getSnapshotById({
        project_id: "project-1",
        snapshotId: SNAPSHOT_ID,
      })
      expect(result.id).toBe(SNAPSHOT_ID)
    })

    it("throws NOT_FOUND when project_id is different", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ snapshot: { id: SNAPSHOT_ID, project_id: OTHER_PROJECT } }))
      await expect(
        h.caller.sharedFileSystem.getSnapshotById({ project_id: "project-1", snapshotId: SNAPSHOT_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })

    it("uses list fallback when project_id is missing", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ snapshot: { id: SNAPSHOT_ID } }))
      h.get.mockResolvedValueOnce(h.response({ snapshots: [{ id: SNAPSHOT_ID }] }))
      const result = await h.caller.sharedFileSystem.getSnapshotById({
        project_id: "project-1",
        snapshotId: SNAPSHOT_ID,
      })
      expect(result.id).toBe(SNAPSHOT_ID)
      expect(h.get).toHaveBeenCalledTimes(2)
    })

    it("throws NOT_FOUND when list fallback rejects with 404", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ snapshot: { id: SNAPSHOT_ID } }))
      h.get.mockRejectedValueOnce(new SignalOpenstackApiError("not found", 404))
      await expect(
        h.caller.sharedFileSystem.getSnapshotById({ project_id: "project-1", snapshotId: SNAPSHOT_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })
  })
})

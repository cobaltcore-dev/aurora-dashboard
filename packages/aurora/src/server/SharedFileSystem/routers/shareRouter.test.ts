import { describe, it, expect } from "vitest"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { setupManila, SHARE_ID, OTHER_PROJECT } from "./mockContext"
import { buildSharedFileSystemRouters } from "./index"
import { auroraRouter, createCallerFactory } from "../../trpc"
import type { AuroraPortalContext } from "../../context"

describe("shareRouter", () => {
  describe("listShares", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(h.caller.sharedFileSystem.listShares({ project_id: "project-1" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
      expect(h.session.service).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ shares: [] }))
      await h.caller.sharedFileSystem.listShares({ project_id: "project-1" })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:shares:list")
    })

    it("sends the correct path and microversion header", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ shares: [] }))
      await h.caller.sharedFileSystem.listShares({ project_id: "project-1" })
      expect(h.get).toHaveBeenCalledWith(
        "shares/detail",
        expect.objectContaining({
          headers: { "X-OpenStack-Manila-API-Version": "2.65" },
        })
      )
      expect(h.get.mock.calls[0][1]).not.toHaveProperty("headers.X-OpenStack-Manila-API-Experimental")
    })

    it("filters out shares from other projects", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          shares: [
            { id: "share-1", project_id: "project-1" },
            { id: "share-2", project_id: OTHER_PROJECT },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listShares({ project_id: "project-1" })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("share-1")
    })

    it("maps SignalOpenstackApiError to tRPC error without exposing backend message", async () => {
      const h = setupManila()
      h.get.mockRejectedValue(new SignalOpenstackApiError("backend secret", 500))
      await expect(h.caller.sharedFileSystem.listShares({ project_id: "project-1" })).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      })
    })

    it("throws NOT_FOUND when service is missing from catalog", async () => {
      const h = setupManila({ catalog: [] })
      await expect(h.caller.sharedFileSystem.listShares({ project_id: "project-1" })).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: expect.stringContaining("shared file system service"),
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("throws INTERNAL_SERVER_ERROR on malformed response", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ shares: [{ name: "no id" }] }))
      await expect(h.caller.sharedFileSystem.listShares({ project_id: "project-1" })).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invalid shared file system response.",
      })
    })
  })

  describe("getShareById", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(
        h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:shares:read")
    })

    it("sends the correct path", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      expect(h.get).toHaveBeenCalledWith(`shares/${SHARE_ID}`, expect.anything())
    })

    it("rejects invalid UUID", async () => {
      const h = setupManila()
      await expect(
        h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: "../other" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("returns share when project_id matches", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      const result = await h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      expect(result.id).toBe(SHARE_ID)
    })

    it("throws NOT_FOUND when project_id is different", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share: { id: SHARE_ID, project_id: OTHER_PROJECT } }))
      await expect(
        h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })

    it("uses list fallback when project_id is missing", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID } }))
      h.get.mockResolvedValueOnce(h.response({ shares: [{ id: SHARE_ID }] }))
      const result = await h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      expect(result.id).toBe(SHARE_ID)
      expect(h.get).toHaveBeenCalledTimes(2)
    })

    it("throws NOT_FOUND when list fallback does not contain the share", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID } }))
      h.get.mockResolvedValueOnce(h.response({ shares: [] }))
      await expect(
        h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })

    it("throws NOT_FOUND when list permission is denied", async () => {
      const h = setupManila()
      h.check.mockImplementation((_, perm) => perm === "shared-file-system:shares:read")
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID } }))
      await expect(
        h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
      expect(h.get).toHaveBeenCalledTimes(1)
    })

    it("throws NOT_FOUND when list fallback rejects with 403", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID } }))
      h.get.mockRejectedValueOnce(new SignalOpenstackApiError("forbidden", 403))
      await expect(
        h.caller.sharedFileSystem.getShareById({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })
  })

  describe("getShareExportLocations", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(
        h.caller.sharedFileSystem.getShareExportLocations({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      h.get.mockResolvedValueOnce(h.response({ export_locations: [] }))
      await h.caller.sharedFileSystem.getShareExportLocations({ project_id: "project-1", shareId: SHARE_ID })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:export_locations:list")
    })

    it("sends the correct path", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      h.get.mockResolvedValueOnce(h.response({ export_locations: [] }))
      await h.caller.sharedFileSystem.getShareExportLocations({ project_id: "project-1", shareId: SHARE_ID })
      expect(h.get).toHaveBeenCalledWith(`shares/${SHARE_ID}/export_locations`, expect.anything())
    })

    it("checks share ownership before fetching export locations", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: OTHER_PROJECT } }))
      await expect(
        h.caller.sharedFileSystem.getShareExportLocations({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
      expect(h.get).toHaveBeenCalledTimes(1)
    })

    it("returns export locations when share is owned", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      h.get.mockResolvedValueOnce(
        h.response({ export_locations: [{ id: "loc-1", path: "/mnt/share", preferred: true }] })
      )
      const result = await h.caller.sharedFileSystem.getShareExportLocations({
        project_id: "project-1",
        shareId: SHARE_ID,
      })
      expect(result).toHaveLength(1)
      expect(result[0].path).toBe("/mnt/share")
    })
  })

  it("passes abort signal to Manila requests", async () => {
    const h = setupManila()
    h.get.mockResolvedValue(h.response({ shares: [] }))
    expect(h.controller.signal.aborted).toBe(false)
    await h.caller.sharedFileSystem.listShares({ project_id: "project-1" })
    expect(h.get.mock.calls[0][1]).toHaveProperty("signal")
    h.controller.abort()
    expect(h.controller.signal.aborted).toBe(true)
  })

  it("maps various SignalOpenstackApiError status codes without exposing backend message", async () => {
    const cases = [
      { status: 401, code: "UNAUTHORIZED" },
      { status: 400, code: "BAD_REQUEST" },
      { status: 403, code: "FORBIDDEN" },
      { status: 404, code: "NOT_FOUND" },
      { status: 500, code: "INTERNAL_SERVER_ERROR" },
    ] as const
    for (const { status, code } of cases) {
      const h = setupManila()
      h.get.mockRejectedValue(new SignalOpenstackApiError("backend secret", status))
      await expect(h.caller.sharedFileSystem.listShares({ project_id: "project-1" })).rejects.toMatchObject({ code })
    }
  })

  it("works at startup without a policy file", async () => {
    const h = setupManila()
    h.get.mockResolvedValue(h.response({ shares: [] }))
    const routers = buildSharedFileSystemRouters("/nonexistent")
    const router = auroraRouter(routers)
    const caller = createCallerFactory(router)(h.ctx as AuroraPortalContext)
    expect(
      await caller.sharedFileSystem.canUser({ project_id: "project-1", permission: ["shared-file-system:shares:list"] })
    ).toEqual([false])
    await expect(caller.sharedFileSystem.listShares({ project_id: "project-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    expect(h.get).not.toHaveBeenCalled()
    expect(caller.sharedFileSystem.listShares).toBeDefined()
    expect(caller.sharedFileSystem.getShareById).toBeDefined()
    expect(caller.sharedFileSystem.getShareExportLocations).toBeDefined()
  })
})

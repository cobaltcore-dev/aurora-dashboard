import { describe, it, expect } from "vitest"
import { setupManila, SHARE_NETWORK_ID, OTHER_PROJECT } from "./mockContext"

describe("shareNetworkRouter", () => {
  describe("listShareNetworks", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(h.caller.sharedFileSystem.listShareNetworks({ project_id: "project-1" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share_networks: [] }))
      await h.caller.sharedFileSystem.listShareNetworks({ project_id: "project-1" })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:share_networks:list")
    })

    it("sends the correct path and microversion header", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share_networks: [] }))
      await h.caller.sharedFileSystem.listShareNetworks({ project_id: "project-1" })
      expect(h.get).toHaveBeenCalledWith(
        "share-networks/detail",
        expect.objectContaining({
          headers: { "X-OpenStack-Manila-API-Version": "2.65" },
        })
      )
    })

    it("filters out share networks from other projects", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          share_networks: [
            { id: "net-1", project_id: "project-1" },
            { id: "net-2", project_id: OTHER_PROJECT },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listShareNetworks({ project_id: "project-1" })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("net-1")
    })
  })

  describe("getShareNetworkById", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(
        h.caller.sharedFileSystem.getShareNetworkById({ project_id: "project-1", shareNetworkId: SHARE_NETWORK_ID })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share_network: { id: SHARE_NETWORK_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getShareNetworkById({ project_id: "project-1", shareNetworkId: SHARE_NETWORK_ID })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:share_networks:read")
    })

    it("sends the correct path", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share_network: { id: SHARE_NETWORK_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getShareNetworkById({ project_id: "project-1", shareNetworkId: SHARE_NETWORK_ID })
      expect(h.get).toHaveBeenCalledWith(`share-networks/${SHARE_NETWORK_ID}`, expect.anything())
    })

    it("rejects invalid UUID", async () => {
      const h = setupManila()
      await expect(
        h.caller.sharedFileSystem.getShareNetworkById({ project_id: "project-1", shareNetworkId: "../other" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("returns share network when project_id matches", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share_network: { id: SHARE_NETWORK_ID, project_id: "project-1" } }))
      const result = await h.caller.sharedFileSystem.getShareNetworkById({
        project_id: "project-1",
        shareNetworkId: SHARE_NETWORK_ID,
      })
      expect(result.id).toBe(SHARE_NETWORK_ID)
    })

    it("throws NOT_FOUND when project_id is different", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ share_network: { id: SHARE_NETWORK_ID, project_id: OTHER_PROJECT } }))
      await expect(
        h.caller.sharedFileSystem.getShareNetworkById({ project_id: "project-1", shareNetworkId: SHARE_NETWORK_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })

    it("uses list fallback when project_id is missing", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share_network: { id: SHARE_NETWORK_ID } }))
      h.get.mockResolvedValueOnce(h.response({ share_networks: [{ id: SHARE_NETWORK_ID }] }))
      const result = await h.caller.sharedFileSystem.getShareNetworkById({
        project_id: "project-1",
        shareNetworkId: SHARE_NETWORK_ID,
      })
      expect(result.id).toBe(SHARE_NETWORK_ID)
      expect(h.get).toHaveBeenCalledTimes(2)
    })
  })
})

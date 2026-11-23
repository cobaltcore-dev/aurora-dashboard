import { describe, it, expect } from "vitest"
import { setupManila, SHARE_ID, OTHER_PROJECT } from "./mockContext"

describe("replicaRouter", () => {
  describe("listReplicas", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(
        h.caller.sharedFileSystem.listReplicas({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      h.get.mockResolvedValueOnce(h.response({ share_replicas: [] }))
      await h.caller.sharedFileSystem.listReplicas({ project_id: "project-1", shareId: SHARE_ID })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:replicas:list")
    })

    it("sends the correct path and microversion header without experimental header", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      h.get.mockResolvedValueOnce(h.response({ share_replicas: [] }))
      await h.caller.sharedFileSystem.listReplicas({ project_id: "project-1", shareId: SHARE_ID })
      expect(h.get).toHaveBeenCalledWith(
        "share-replicas/detail",
        expect.objectContaining({
          queryParams: { share_id: SHARE_ID },
          headers: { "X-OpenStack-Manila-API-Version": "2.65" },
        })
      )
      expect(h.get.mock.calls[1][1]).not.toHaveProperty("headers.X-OpenStack-Manila-API-Experimental")
    })

    it("checks share ownership before fetching replicas", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: OTHER_PROJECT } }))
      await expect(
        h.caller.sharedFileSystem.listReplicas({ project_id: "project-1", shareId: SHARE_ID })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
      expect(h.get).toHaveBeenCalledTimes(1)
    })

    it("filters out replicas with different share_id", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      h.get.mockResolvedValueOnce(
        h.response({
          share_replicas: [
            { id: "replica-1", share_id: SHARE_ID },
            { id: "replica-2", share_id: "other-share" },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listReplicas({ project_id: "project-1", shareId: SHARE_ID })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("replica-1")
    })

    it("rejects invalid shareId UUID", async () => {
      const h = setupManila()
      await expect(
        h.caller.sharedFileSystem.listReplicas({ project_id: "project-1", shareId: "../other" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("returns replicas when share is owned", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ share: { id: SHARE_ID, project_id: "project-1" } }))
      h.get.mockResolvedValueOnce(
        h.response({ share_replicas: [{ id: "replica-1", share_id: SHARE_ID, replica_state: "active" }] })
      )
      const result = await h.caller.sharedFileSystem.listReplicas({ project_id: "project-1", shareId: SHARE_ID })
      expect(result).toHaveLength(1)
      expect(result[0].replica_state).toBe("active")
    })
  })
})

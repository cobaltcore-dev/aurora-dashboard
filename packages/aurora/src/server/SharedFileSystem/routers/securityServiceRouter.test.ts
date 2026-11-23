import { describe, it, expect } from "vitest"
import { setupManila, SECURITY_SERVICE_ID, SHARE_NETWORK_ID, OTHER_PROJECT } from "./mockContext"

describe("securityServiceRouter", () => {
  describe("listSecurityServices", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_services: [] }))
      await h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1" })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:security_services:list")
    })

    it("sends the correct path and microversion header", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_services: [] }))
      await h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1" })
      expect(h.get).toHaveBeenCalledWith(
        "security-services/detail",
        expect.objectContaining({
          headers: { "X-OpenStack-Manila-API-Version": "2.65" },
        })
      )
    })

    it("sends share_network_id query parameter when provided", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_services: [] }))
      await h.caller.sharedFileSystem.listSecurityServices({
        project_id: "project-1",
        shareNetworkId: SHARE_NETWORK_ID,
      })
      expect(h.get).toHaveBeenCalledWith(
        "security-services/detail",
        expect.objectContaining({
          queryParams: { share_network_id: SHARE_NETWORK_ID },
        })
      )
    })

    it("does not send query params when shareNetworkId is omitted", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_services: [] }))
      await h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1" })
      expect(h.get).toHaveBeenCalledWith(
        "security-services/detail",
        expect.not.objectContaining({ queryParams: expect.anything() })
      )
    })

    it("filters out security services from other projects", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          security_services: [
            { id: "sec-1", project_id: "project-1" },
            { id: "sec-2", project_id: OTHER_PROJECT },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1" })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("sec-1")
    })

    it("filters by share_networks when shareNetworkId is provided", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          security_services: [
            { id: "sec-1", project_id: "project-1", share_networks: [SHARE_NETWORK_ID] },
            { id: "sec-2", project_id: "project-1", share_networks: ["other-network"] },
            { id: "sec-3", project_id: "project-1" },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listSecurityServices({
        project_id: "project-1",
        shareNetworkId: SHARE_NETWORK_ID,
      })
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe("sec-1")
      expect(result[1].id).toBe("sec-3")
    })

    it("does not filter by share_networks when shareNetworkId is not provided", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          security_services: [
            { id: "sec-1", project_id: "project-1", share_networks: [SHARE_NETWORK_ID] },
            { id: "sec-2", project_id: "project-1", share_networks: ["other-network"] },
          ],
        })
      )
      const result = await h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1" })
      expect(result).toHaveLength(2)
    })

    it("rejects invalid shareNetworkId UUID", async () => {
      const h = setupManila()
      await expect(
        h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1", shareNetworkId: "../other" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("strips password from list response", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          security_services: [{ id: "sec-1", project_id: "project-1", password: "s3cret", type: "ldap" }],
        })
      )
      const result = await h.caller.sharedFileSystem.listSecurityServices({ project_id: "project-1" })
      expect(result).toHaveLength(1)
      expect("password" in result[0]).toBe(false)
      expect(JSON.stringify(result)).not.toContain("s3cret")
    })
  })

  describe("getSecurityServiceById", () => {
    it("checks permission before making Manila call", async () => {
      const h = setupManila({ allowed: false })
      await expect(
        h.caller.sharedFileSystem.getSecurityServiceById({
          project_id: "project-1",
          securityServiceId: SECURITY_SERVICE_ID,
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("calls the correct permission", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_service: { id: SECURITY_SERVICE_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getSecurityServiceById({
        project_id: "project-1",
        securityServiceId: SECURITY_SERVICE_ID,
      })
      expect(h.check.mock.calls[0][1]).toBe("shared-file-system:security_services:read")
    })

    it("sends the correct path", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_service: { id: SECURITY_SERVICE_ID, project_id: "project-1" } }))
      await h.caller.sharedFileSystem.getSecurityServiceById({
        project_id: "project-1",
        securityServiceId: SECURITY_SERVICE_ID,
      })
      expect(h.get).toHaveBeenCalledWith(`security-services/${SECURITY_SERVICE_ID}`, expect.anything())
    })

    it("rejects invalid UUID", async () => {
      const h = setupManila()
      await expect(
        h.caller.sharedFileSystem.getSecurityServiceById({ project_id: "project-1", securityServiceId: "../other" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      })
      expect(h.get).not.toHaveBeenCalled()
    })

    it("returns security service when project_id matches", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_service: { id: SECURITY_SERVICE_ID, project_id: "project-1" } }))
      const result = await h.caller.sharedFileSystem.getSecurityServiceById({
        project_id: "project-1",
        securityServiceId: SECURITY_SERVICE_ID,
      })
      expect(result.id).toBe(SECURITY_SERVICE_ID)
    })

    it("throws NOT_FOUND when project_id is different", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(h.response({ security_service: { id: SECURITY_SERVICE_ID, project_id: OTHER_PROJECT } }))
      await expect(
        h.caller.sharedFileSystem.getSecurityServiceById({
          project_id: "project-1",
          securityServiceId: SECURITY_SERVICE_ID,
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      })
    })

    it("uses list fallback when project_id is missing", async () => {
      const h = setupManila()
      h.get.mockResolvedValueOnce(h.response({ security_service: { id: SECURITY_SERVICE_ID } }))
      h.get.mockResolvedValueOnce(h.response({ security_services: [{ id: SECURITY_SERVICE_ID }] }))
      const result = await h.caller.sharedFileSystem.getSecurityServiceById({
        project_id: "project-1",
        securityServiceId: SECURITY_SERVICE_ID,
      })
      expect(result.id).toBe(SECURITY_SERVICE_ID)
      expect(h.get).toHaveBeenCalledTimes(2)
    })

    it("strips password from show response", async () => {
      const h = setupManila()
      h.get.mockResolvedValue(
        h.response({
          security_service: { id: SECURITY_SERVICE_ID, project_id: "project-1", password: "s3cret", type: "ldap" },
        })
      )
      const result = await h.caller.sharedFileSystem.getSecurityServiceById({
        project_id: "project-1",
        securityServiceId: SECURITY_SERVICE_ID,
      })
      expect("password" in result).toBe(false)
      expect(JSON.stringify(result)).not.toContain("s3cret")
    })
  })
})

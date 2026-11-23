import { describe, expect, it } from "vitest"
import { shareSchema, exportLocationSchema } from "./share"
import { shareNetworkSchema } from "./shareNetwork"
import { securityServiceSchema } from "./securityService"
import { shareIdInputSchema } from "./share"
import { listShareSnapshotsInputSchema } from "./snapshot"

describe("Manila Zod types", () => {
  describe("shareSchema", () => {
    it("keeps unknown status strings and replication_type", () => {
      const result = shareSchema.parse({
        id: "test-id",
        status: "unknown_status",
        replication_type: "dr",
      })
      expect(result.status).toBe("unknown_status")
      expect(result.replication_type).toBe("dr")
    })

    it("parses size to undefined when given a string", () => {
      const result = shareSchema.parse({ id: "test-id", size: "x" })
      expect(result.size).toBeUndefined()
    })

    it("parses is_public string 'false' to boolean false", () => {
      const result = shareSchema.parse({ id: "test-id", is_public: "false" })
      expect(result.is_public).toBe(false)
    })

    it("parses has_replicas non-boolean to undefined", () => {
      const result = shareSchema.parse({ id: "test-id", has_replicas: "maybe" })
      expect(result.has_replicas).toBeUndefined()
    })

    it("parses missing share_type_name to undefined", () => {
      const result = shareSchema.parse({ id: "test-id" })
      expect(result.share_type_name).toBeUndefined()
    })

    it("rejects an item without id", () => {
      expect(() => shareSchema.parse({ name: "test" })).toThrow()
    })
  })

  describe("exportLocationSchema", () => {
    it("parses valid data and strips admin-only fields", () => {
      const result = exportLocationSchema.parse({
        id: "loc-1",
        path: "/mnt/share",
        preferred: true,
        is_admin_only: false,
        share_instance_id: "x",
      })
      expect(result).toEqual({
        id: "loc-1",
        path: "/mnt/share",
        preferred: true,
      })
    })
  })

  describe("shareNetworkSchema", () => {
    it("parses the 2.51+ shape and keeps the share_network_subnets array", () => {
      const result = shareNetworkSchema.parse({
        id: "net-1",
        name: "test-network",
        share_network_subnets: [
          {
            id: "subnet-1",
            neutron_net_id: "net-123",
            cidr: "10.0.0.0/24",
          },
        ],
      })
      expect(result.share_network_subnets).toHaveLength(1)
      expect(result.share_network_subnets?.[0]?.neutron_net_id).toBe("net-123")
    })

    it("turns a ≤ 2.50 object into one subnet and drops the top-level legacy keys", () => {
      const result = shareNetworkSchema.parse({
        id: "net-1",
        name: "test-network",
        neutron_net_id: "net-456",
        cidr: "192.168.0.0/24",
        mtu: 1500,
        gateway: "192.168.0.1",
        created_at: "2024-01-01T00:00:00",
        updated_at: "2024-01-02T00:00:00",
      })
      expect(result.share_network_subnets).toHaveLength(1)
      expect(result.share_network_subnets?.[0]?.neutron_net_id).toBe("net-456")
      expect(result.share_network_subnets?.[0]?.cidr).toBe("192.168.0.0/24")
      expect(result.share_network_subnets?.[0]?.mtu).toBe(1500)
      expect("neutron_net_id" in result).toBe(false)
      expect("cidr" in result).toBe(false)
    })

    it("with neither shape gives share_network_subnets: undefined", () => {
      const result = shareNetworkSchema.parse({
        id: "net-1",
        name: "test-network",
      })
      expect(result.share_network_subnets).toBeUndefined()
    })
  })

  describe("securityServiceSchema", () => {
    it("strips password and does not include it in stringified output", () => {
      const result = securityServiceSchema.parse({
        id: "sec-1",
        type: "ldap",
        password: "s3cret",
        ou: null,
      })
      expect("password" in result).toBe(false)
      expect(JSON.stringify(result)).not.toContain("s3cret")
    })
  })

  describe("ID input schemas", () => {
    it("rejects invalid UUIDs", () => {
      expect(() => shareIdInputSchema.parse({ project_id: "p1", shareId: "../other" })).toThrow()
    })

    it("accepts listShareSnapshotsInputSchema without shareId", () => {
      const result = listShareSnapshotsInputSchema.parse({ project_id: "p1" })
      expect(result.shareId).toBeUndefined()
    })
  })
})

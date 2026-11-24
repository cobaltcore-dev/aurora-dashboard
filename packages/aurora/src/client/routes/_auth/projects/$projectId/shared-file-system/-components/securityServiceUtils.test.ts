import { describe, it, expect } from "vitest"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import {
  getSecurityServiceTypeLabel,
  getSecurityServiceDisplayName,
  sortSecurityServices,
} from "./securityServiceUtils"

describe("securityServiceUtils", () => {
  describe("getSecurityServiceTypeLabel", () => {
    it("returns the label for known types", () => {
      expect(getSecurityServiceTypeLabel("ldap")).toBe("LDAP")
      expect(getSecurityServiceTypeLabel("kerberos")).toBe("Kerberos")
      expect(getSecurityServiceTypeLabel("active_directory")).toBe("Active Directory")
    })

    it("handles mixed case for known types", () => {
      expect(getSecurityServiceTypeLabel("LDAP")).toBe("LDAP")
      expect(getSecurityServiceTypeLabel("Kerberos")).toBe("Kerberos")
      expect(getSecurityServiceTypeLabel("Active_Directory")).toBe("Active Directory")
    })

    it("returns the raw trimmed value for unknown types", () => {
      expect(getSecurityServiceTypeLabel("unknown")).toBe("unknown")
      expect(getSecurityServiceTypeLabel("  custom  ")).toBe("custom")
    })

    it("returns undefined for empty or null types", () => {
      expect(getSecurityServiceTypeLabel("")).toBeUndefined()
      expect(getSecurityServiceTypeLabel("   ")).toBeUndefined()
      expect(getSecurityServiceTypeLabel(null)).toBeUndefined()
      expect(getSecurityServiceTypeLabel(undefined)).toBeUndefined()
    })
  })

  describe("getSecurityServiceDisplayName", () => {
    it("returns the name when present", () => {
      const service: Pick<SecurityService, "id" | "name"> = { id: "sec-1", name: "My Service" }
      expect(getSecurityServiceDisplayName(service)).toBe("My Service")
    })

    it("trims the name", () => {
      const service: Pick<SecurityService, "id" | "name"> = { id: "sec-1", name: "  Spaced  " }
      expect(getSecurityServiceDisplayName(service)).toBe("Spaced")
    })

    it("falls back to ID when name is missing", () => {
      const service: Pick<SecurityService, "id" | "name"> = { id: "sec-1" }
      expect(getSecurityServiceDisplayName(service)).toBe("sec-1")
    })

    it("falls back to ID when name is empty", () => {
      const service: Pick<SecurityService, "id" | "name"> = { id: "sec-1", name: "" }
      expect(getSecurityServiceDisplayName(service)).toBe("sec-1")
    })
  })

  describe("sortSecurityServices", () => {
    const serviceA: SecurityService = {
      id: "sec-1",
      name: "Alpha",
      type: "ldap",
      status: "new",
      project_id: null,
      user: null,
      dns_ip: null,
      ou: null,
      domain: null,
      server: null,
      description: null,
      created_at: null,
      updated_at: null,
    }

    const serviceB: SecurityService = {
      id: "sec-2",
      name: "Beta",
      type: "kerberos",
      status: "new",
      project_id: null,
      user: null,
      dns_ip: null,
      ou: null,
      domain: null,
      server: null,
      description: null,
      created_at: null,
      updated_at: null,
    }

    const serviceC: SecurityService = {
      id: "sec-3",
      type: "active_directory",
      status: "new",
      project_id: null,
      user: null,
      dns_ip: null,
      ou: null,
      domain: null,
      server: null,
      description: null,
      created_at: null,
      updated_at: null,
    }

    it("sorts by display name", () => {
      const result = sortSecurityServices([serviceB, serviceA])
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-2"])
    })

    it("sorts unnamed services by ID", () => {
      const result = sortSecurityServices([serviceC, serviceA])
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-3"])
    })

    it("does not mutate the input array", () => {
      const input = [serviceB, serviceA]
      const result = sortSecurityServices(input)
      expect(result).not.toBe(input)
      expect(input[0]).toBe(serviceB)
    })

    it("tie-breaks by ID when names are equal", () => {
      const service1: SecurityService = { ...serviceA, id: "sec-5", name: "Same" }
      const service2: SecurityService = { ...serviceA, id: "sec-4", name: "Same" }
      const result = sortSecurityServices([service1, service2])
      expect(result.map((s) => s.id)).toEqual(["sec-4", "sec-5"])
    })
  })
})

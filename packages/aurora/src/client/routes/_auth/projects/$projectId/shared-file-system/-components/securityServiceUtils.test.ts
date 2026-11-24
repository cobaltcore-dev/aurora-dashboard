import { describe, it, expect } from "vitest"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import {
  getSecurityServiceTypeLabel,
  getSecurityServiceDisplayName,
  sortSecurityServices,
  matchesSecurityServiceSearch,
  filterSecurityServices,
  SECURITY_SERVICE_FILTER_OTHER,
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

    it("sorts by display name (default)", () => {
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

    it("sorts by name ascending", () => {
      const result = sortSecurityServices([serviceB, serviceA, serviceC], "name", "asc")
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-2", "sec-3"])
    })

    it("sorts by name descending", () => {
      const result = sortSecurityServices([serviceA, serviceB, serviceC], "name", "desc")
      expect(result.map((s) => s.id)).toEqual(["sec-3", "sec-2", "sec-1"])
    })

    it("sorts by type ascending", () => {
      const result = sortSecurityServices([serviceB, serviceA, serviceC], "type", "asc")
      // Active Directory < Kerberos < LDAP
      expect(result.map((s) => s.id)).toEqual(["sec-3", "sec-2", "sec-1"])
    })

    it("sorts by type descending", () => {
      const result = sortSecurityServices([serviceA, serviceB, serviceC], "type", "desc")
      // LDAP > Kerberos > Active Directory
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-2", "sec-3"])
    })

    it("sorts missing types last in ascending order", () => {
      const withoutType: SecurityService = { ...serviceA, id: "sec-4", type: null }
      const result = sortSecurityServices([withoutType, serviceA, serviceB], "type", "asc")
      expect(result.map((s) => s.id)).toEqual(["sec-2", "sec-1", "sec-4"])
    })

    it("sorts missing types last in descending order", () => {
      const withoutType: SecurityService = { ...serviceA, id: "sec-4", type: null }
      const result = sortSecurityServices([serviceA, withoutType, serviceB], "type", "desc")
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-2", "sec-4"])
    })

    it("sorts by created_at ascending", () => {
      const service1: SecurityService = { ...serviceA, id: "sec-1", created_at: "2024-01-01T10:00:00Z" }
      const service2: SecurityService = { ...serviceB, id: "sec-2", created_at: "2024-01-02T10:00:00Z" }
      const service3: SecurityService = { ...serviceC, id: "sec-3", created_at: "2024-01-03T10:00:00Z" }
      const result = sortSecurityServices([service3, service1, service2], "created_at", "asc")
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-2", "sec-3"])
    })

    it("sorts by created_at descending", () => {
      const service1: SecurityService = { ...serviceA, id: "sec-1", created_at: "2024-01-01T10:00:00Z" }
      const service2: SecurityService = { ...serviceB, id: "sec-2", created_at: "2024-01-02T10:00:00Z" }
      const service3: SecurityService = { ...serviceC, id: "sec-3", created_at: "2024-01-03T10:00:00Z" }
      const result = sortSecurityServices([service1, service3, service2], "created_at", "desc")
      expect(result.map((s) => s.id)).toEqual(["sec-3", "sec-2", "sec-1"])
    })

    it("sorts missing created_at last in ascending order", () => {
      const service1: SecurityService = { ...serviceA, id: "sec-1", created_at: "2024-01-01T10:00:00Z" }
      const service2: SecurityService = { ...serviceB, id: "sec-2", created_at: null }
      const result = sortSecurityServices([service2, service1], "created_at", "asc")
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-2"])
    })

    it("sorts missing created_at last in descending order", () => {
      const service1: SecurityService = { ...serviceA, id: "sec-1", created_at: "2024-01-01T10:00:00Z" }
      const service2: SecurityService = { ...serviceB, id: "sec-2", created_at: null }
      const result = sortSecurityServices([service1, service2], "created_at", "desc")
      expect(result.map((s) => s.id)).toEqual(["sec-1", "sec-2"])
    })
  })

  describe("matchesSecurityServiceSearch", () => {
    const service: SecurityService = {
      id: "sec-123",
      name: "Test Service",
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

    it("matches by name (case-insensitive)", () => {
      expect(matchesSecurityServiceSearch(service, "test")).toBe(true)
      expect(matchesSecurityServiceSearch(service, "TEST")).toBe(true)
      expect(matchesSecurityServiceSearch(service, "Service")).toBe(true)
    })

    it("matches by ID (case-insensitive)", () => {
      expect(matchesSecurityServiceSearch(service, "sec-123")).toBe(true)
      expect(matchesSecurityServiceSearch(service, "SEC-123")).toBe(true)
      expect(matchesSecurityServiceSearch(service, "123")).toBe(true)
    })

    it("returns true for empty search term", () => {
      expect(matchesSecurityServiceSearch(service, "")).toBe(true)
      expect(matchesSecurityServiceSearch(service, "   ")).toBe(true)
    })

    it("returns false when no match", () => {
      expect(matchesSecurityServiceSearch(service, "nonexistent")).toBe(false)
    })

    it("matches unnamed service by ID", () => {
      const unnamed: SecurityService = { ...service, name: null }
      expect(matchesSecurityServiceSearch(unnamed, "sec-123")).toBe(true)
    })
  })

  describe("filterSecurityServices", () => {
    const ldapService: SecurityService = {
      id: "sec-1",
      name: "LDAP Service",
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

    const kerberosService: SecurityService = {
      id: "sec-2",
      name: "Kerberos Service",
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

    const adService: SecurityService = {
      id: "sec-3",
      name: "AD Service",
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

    const unknownService: SecurityService = {
      id: "sec-4",
      name: "Unknown Service",
      type: "custom",
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

    const noTypeService: SecurityService = {
      id: "sec-5",
      name: "No Type Service",
      type: null,
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

    const services = [ldapService, kerberosService, adService, unknownService, noTypeService]

    it("filters by search term", () => {
      const result = filterSecurityServices(services, "ldap", {})
      expect(result.map((s) => s.id)).toEqual(["sec-1"])
    })

    it("filters by type ldap", () => {
      const result = filterSecurityServices(services, "", { type: "ldap" })
      expect(result.map((s) => s.id)).toEqual(["sec-1"])
    })

    it("filters by type kerberos", () => {
      const result = filterSecurityServices(services, "", { type: "kerberos" })
      expect(result.map((s) => s.id)).toEqual(["sec-2"])
    })

    it("filters by type active_directory", () => {
      const result = filterSecurityServices(services, "", { type: "active_directory" })
      expect(result.map((s) => s.id)).toEqual(["sec-3"])
    })

    it("filters by type other (unknown and missing)", () => {
      const result = filterSecurityServices(services, "", { type: SECURITY_SERVICE_FILTER_OTHER })
      expect(result.map((s) => s.id)).toEqual(["sec-4", "sec-5"])
    })

    it("excludes known type with mixed case from other filter", () => {
      const mixedCase: SecurityService = { ...ldapService, id: "sec-6", type: "LDAP" }
      const result = filterSecurityServices([ldapService, mixedCase, unknownService], "", {
        type: SECURITY_SERVICE_FILTER_OTHER,
      })
      expect(result.map((s) => s.id)).toEqual(["sec-4"])
    })

    it("combines search and type filter", () => {
      const result = filterSecurityServices(services, "service", { type: "ldap" })
      expect(result.map((s) => s.id)).toEqual(["sec-1"])
    })

    it("returns all services when no filters", () => {
      const result = filterSecurityServices(services, "", {})
      expect(result).toHaveLength(5)
    })
  })
})

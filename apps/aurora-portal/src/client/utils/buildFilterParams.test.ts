import { describe, it, expect } from "vitest"
import { buildFilterParams } from "./buildFilterParams"
import { FilterSettings } from "@/client/components/ListToolbar/types"

describe("buildFilterParams", () => {
  describe("returns empty params", () => {
    it("when selectedFilters is undefined", () => {
      const filterSettings: FilterSettings = {
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({})
    })

    it("when selectedFilters is an empty array", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({})
    })

    it("when all selectedFilters are inactive", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "status", value: "ACTIVE", inactive: true },
          { name: "shared", value: "true", inactive: true },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({})
    })
  })

  describe("handles string filter values", () => {
    it("converts single string filter to params (FloatingIp status filter)", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [{ name: "status", value: "ACTIVE" }],
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ status: "ACTIVE" })
    })

    it("converts multiple string filters to params", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "status", value: "DOWN" },
          { name: "router_id", value: "router-123" },
          { name: "project_id", value: "project-456" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({
        status: "DOWN",
        router_id: "router-123",
        project_id: "project-456",
      })
    })

    it("handles different status values", () => {
      const activeFilter: FilterSettings = {
        selectedFilters: [{ name: "status", value: "ACTIVE" }],
        filters: [],
      }
      expect(buildFilterParams(activeFilter)).toEqual({ status: "ACTIVE" })

      const downFilter: FilterSettings = {
        selectedFilters: [{ name: "status", value: "DOWN" }],
        filters: [],
      }
      expect(buildFilterParams(downFilter)).toEqual({ status: "DOWN" })

      const errorFilter: FilterSettings = {
        selectedFilters: [{ name: "status", value: "ERROR" }],
        filters: [],
      }
      expect(buildFilterParams(errorFilter)).toEqual({ status: "ERROR" })
    })
  })

  describe("handles boolean string values", () => {
    it('converts "true" string to boolean true (SecurityGroup shared filter)', () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [{ name: "shared", value: "true" }],
        filters: [
          {
            displayName: "Shared",
            filterName: "shared",
            values: ["true", "false"],
            supportsMultiValue: false,
          },
        ],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ shared: true })
    })

    it('converts "false" string to boolean false', () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [{ name: "shared", value: "false" }],
        filters: [
          {
            displayName: "Shared",
            filterName: "shared",
            values: ["true", "false"],
            supportsMultiValue: false,
          },
        ],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ shared: false })
    })

    it("handles multiple boolean filters", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "shared", value: "true" },
          { name: "stateful", value: "false" },
          { name: "admin_state_up", value: "true" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({
        shared: true,
        stateful: false,
        admin_state_up: true,
      })
    })
  })

  describe("handles inactive filters", () => {
    it("excludes inactive filters from params", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "status", value: "ACTIVE", inactive: false },
          { name: "shared", value: "true", inactive: true },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ status: "ACTIVE" })
    })

    it("includes filters without inactive property (defaults to active)", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "status", value: "ACTIVE" },
          { name: "shared", value: "true" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({
        status: "ACTIVE",
        shared: true,
      })
    })

    it("handles mix of active and inactive filters", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "status", value: "ACTIVE", inactive: false },
          { name: "router_id", value: "router-1", inactive: true },
          { name: "shared", value: "false" },
          { name: "project_id", value: "proj-1", inactive: true },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({
        status: "ACTIVE",
        shared: false,
      })
    })
  })

  describe("handles mixed filter types", () => {
    it("converts mix of string and boolean filters", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "status", value: "ACTIVE" },
          { name: "shared", value: "true" },
          { name: "project_id", value: "project-123" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({
        status: "ACTIVE",
        shared: true,
        project_id: "project-123",
      })
    })

    it("handles real-world scenario from FloatingIp List", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [{ name: "status", value: "DOWN" }],
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ status: "DOWN" })
    })

    it("handles real-world scenario from SecurityGroup List", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [{ name: "shared", value: "false" }],
        filters: [
          {
            displayName: "Shared",
            filterName: "shared",
            values: ["true", "false"],
            supportsMultiValue: false,
          },
        ],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ shared: false })
    })
  })

  describe("edge cases", () => {
    it("handles empty string values", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [{ name: "description", value: "" }],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ description: "" })
    })

    it("handles numeric string values (not boolean strings)", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [{ name: "revision_number", value: "5" }],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({ revision_number: "5" })
    })

    it('does not convert "TRUE" or "FALSE" (case-sensitive)', () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "uppercase_true", value: "TRUE" },
          { name: "uppercase_false", value: "FALSE" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({
        uppercase_true: "TRUE",
        uppercase_false: "FALSE",
      })
    })

    it("handles special characters in filter values", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "name", value: "web-server-01" },
          { name: "description", value: "Test: VM with special chars!" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(result).toEqual({
        name: "web-server-01",
        description: "Test: VM with special chars!",
      })
    })
  })

  describe("parameter types", () => {
    it("returns Record<string, string | boolean> with correct types", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "status", value: "ACTIVE" },
          { name: "shared", value: "true" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)

      // Check types explicitly
      expect(typeof result.status).toBe("string")
      expect(typeof result.shared).toBe("boolean")
    })

    it("preserves string type for non-boolean string values", () => {
      const filterSettings: FilterSettings = {
        selectedFilters: [
          { name: "param1", value: "value1" },
          { name: "param2", value: "123" },
          { name: "param3", value: "false" },
        ],
        filters: [],
      }

      const result = buildFilterParams(filterSettings)
      expect(typeof result.param1).toBe("string")
      expect(typeof result.param2).toBe("string")
      expect(typeof result.param3).toBe("boolean")
    })
  })
})

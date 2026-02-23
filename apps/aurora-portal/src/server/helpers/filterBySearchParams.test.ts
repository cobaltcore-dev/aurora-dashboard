import { describe, it, expect } from "vitest"
import { filterBySearchParams } from "./filterBySearchParams"
import type { SecurityGroup } from "../Network/types/securityGroup"

describe("filterBySearchParams", () => {
  const mockSecurityGroups: SecurityGroup[] = [
    {
      id: "sg-12345",
      name: "web-server",
      description: "Security group for web servers",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    },
    {
      id: "sg-67890",
      name: "database",
      description: "Security group for database servers",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    },
    {
      id: "sg-abcde",
      name: "api-gateway",
      description: "Gateway for API services",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    },
    {
      id: "sg-fghij",
      name: "default",
      description: "Default security group",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    },
  ]

  describe("returns all security groups", () => {
    it("when searchTerm is undefined", () => {
      const result = filterBySearchParams(mockSecurityGroups, undefined)
      expect(result.length).toBe(4)
      expect(result).toEqual(mockSecurityGroups)
    })

    it("when searchTerm is empty string", () => {
      const result = filterBySearchParams(mockSecurityGroups, "")
      expect(result.length).toBe(4)
      expect(result).toEqual(mockSecurityGroups)
    })

    it("when searchTerm is only whitespace", () => {
      const result = filterBySearchParams(mockSecurityGroups, "   ")
      expect(result.length).toBe(4)
      expect(result).toEqual(mockSecurityGroups)
    })
  })

  describe("filters by name", () => {
    it("finds exact match in name", () => {
      const result = filterBySearchParams(mockSecurityGroups, "web-server")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("finds partial match in name", () => {
      const result = filterBySearchParams(mockSecurityGroups, "web")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("is case-insensitive for name search", () => {
      const result = filterBySearchParams(mockSecurityGroups, "WEB")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })
  })

  describe("filters by description", () => {
    it("finds exact match in description", () => {
      const result = filterBySearchParams(mockSecurityGroups, "Gateway for API services")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("api-gateway")
    })

    it("finds partial match in description", () => {
      const result = filterBySearchParams(mockSecurityGroups, "gateway")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("api-gateway")
    })

    it("is case-insensitive for description search", () => {
      const result = filterBySearchParams(mockSecurityGroups, "GATEWAY")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("api-gateway")
    })
  })

  describe("filters by id", () => {
    it("finds exact match in id", () => {
      const result = filterBySearchParams(mockSecurityGroups, "sg-12345")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("finds partial match in id", () => {
      const result = filterBySearchParams(mockSecurityGroups, "12345")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("finds partial match with sg- prefix", () => {
      const result = filterBySearchParams(mockSecurityGroups, "sg-678")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("database")
    })

    it("is case-insensitive for id search", () => {
      const result = filterBySearchParams(mockSecurityGroups, "SG-ABCDE")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("api-gateway")
    })
  })

  describe("handles multiple matches", () => {
    it("returns multiple results when searchTerm matches multiple security groups", () => {
      const result = filterBySearchParams(mockSecurityGroups, "server")
      expect(result.length).toBe(2)
      const names = result.map((sg) => sg.name).sort()
      expect(names).toEqual(["database", "web-server"])
    })

    it("matches across different fields", () => {
      // "default" appears in both name and description of different groups
      const result = filterBySearchParams(mockSecurityGroups, "default")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("default")
    })
  })

  describe("handles no matches", () => {
    it("returns empty array when searchTerm matches nothing", () => {
      const result = filterBySearchParams(mockSecurityGroups, "nonexistent")
      expect(result.length).toBe(0)
      expect(result).toEqual([])
    })

    it("returns empty array for gibberish search term", () => {
      const result = filterBySearchParams(mockSecurityGroups, "xyzabc123notfound")
      expect(result.length).toBe(0)
      expect(result).toEqual([])
    })
  })

  describe("handles edge cases", () => {
    it("trims whitespace from searchTerm", () => {
      const result = filterBySearchParams(mockSecurityGroups, "  web  ")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("handles security groups with null name", () => {
      const groupsWithNull: SecurityGroup[] = [
        {
          id: "sg-null",
          name: null,
          description: "Has null name",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const result = filterBySearchParams(groupsWithNull, "null")
      expect(result.length).toBe(1)
      expect(result[0].id).toBe("sg-null")
    })

    it("handles security groups with null description", () => {
      const groupsWithNull: SecurityGroup[] = [
        {
          id: "sg-nodesc",
          name: "no-description",
          description: null,
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const result = filterBySearchParams(groupsWithNull, "no-description")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("no-description")
    })

    it("handles empty array input", () => {
      const result = filterBySearchParams([], "web")
      expect(result.length).toBe(0)
      expect(result).toEqual([])
    })
  })

  describe("special characters", () => {
    it("handles search terms with hyphens", () => {
      const result = filterBySearchParams(mockSecurityGroups, "web-server")
      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("handles search terms with numbers", () => {
      const result = filterBySearchParams(mockSecurityGroups, "12345")
      expect(result.length).toBe(1)
      expect(result[0].id).toBe("sg-12345")
    })
  })
})

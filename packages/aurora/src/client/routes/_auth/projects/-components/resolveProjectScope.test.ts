import { describe, it, expect } from "vitest"
import { resolveProjectScope, type ProjectScopeStatus } from "./resolveProjectScope"

describe("resolveProjectScope", () => {
  describe("valid status", () => {
    it("returns 'valid' when scopeProject.id matches projectId", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-123" },
        userProject: { id: "project-123" },
      })

      expect(result).toBe("valid")
    })

    it("returns 'valid' even when userProject is null if scope succeeded", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-123" },
        userProject: null,
      })

      expect(result).toBe("valid")
    })

    it("returns 'valid' even when userProject is undefined if scope succeeded", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-123" },
        userProject: undefined,
      })

      expect(result).toBe("valid")
    })
  })

  describe("not_found status", () => {
    it("returns 'not_found' when scopeProject is undefined and userProject id doesn't match", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: undefined,
        userProject: { id: "project-123" },
      })

      expect(result).toBe("not_found")
    })

    it("returns 'not_found' when scopeProject is null and userProject id doesn't match", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: null,
        userProject: { id: "project-123" },
      })

      expect(result).toBe("not_found")
    })

    it("returns 'not_found' when scopeProject has no id and userProject id doesn't match", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: {},
        userProject: { id: "project-123" },
      })

      expect(result).toBe("not_found")
    })
  })

  describe("scope_failed status", () => {
    it("returns 'scope_failed' when project matches userProject but scopeProject is undefined", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: undefined,
        userProject: { id: "project-123" },
      })

      expect(result).toBe("scope_failed")
    })

    it("returns 'scope_failed' when project matches userProject but scopeProject is null", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: null,
        userProject: { id: "project-123" },
      })

      expect(result).toBe("scope_failed")
    })

    it("returns 'scope_failed' when project matches userProject but scopeProject.id doesn't match", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-456" },
        userProject: { id: "project-123" },
      })

      expect(result).toBe("scope_failed")
    })

    it("returns 'scope_failed' when scopeProject is undefined and userProject is null (can't verify)", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: undefined,
        userProject: null,
      })

      expect(result).toBe("scope_failed")
    })

    it("returns 'scope_failed' when scopeProject is undefined and userProject is undefined (can't verify)", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: undefined,
        userProject: undefined,
      })

      expect(result).toBe("scope_failed")
    })
  })

  describe("type safety", () => {
    it("returns one of the three valid status values", () => {
      const validStatuses: ProjectScopeStatus[] = ["valid", "not_found", "scope_failed"]

      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-123" },
        userProject: { id: "project-123" },
      })

      expect(validStatuses).toContain(result)
    })
  })
})

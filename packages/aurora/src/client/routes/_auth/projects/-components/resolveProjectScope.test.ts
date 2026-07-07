import { describe, it, expect } from "vitest"
import { resolveProjectScope, type ProjectScopeStatus } from "./resolveProjectScope"

describe("resolveProjectScope", () => {
  describe("valid status", () => {
    it("returns 'valid' when scopeProject.id matches projectId", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-123" },
        userProjects: [{ id: "project-123" }, { id: "project-456" }],
      })

      expect(result).toBe("valid")
    })

    it("returns 'valid' even when userProjects is null if scope succeeded", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-123" },
        userProjects: null,
      })

      expect(result).toBe("valid")
    })

    it("returns 'valid' even when userProjects is undefined if scope succeeded", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-123" },
        userProjects: undefined,
      })

      expect(result).toBe("valid")
    })
  })

  describe("not_found status", () => {
    it("returns 'not_found' when scopeProject is undefined and project not in userProjects", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: undefined,
        userProjects: [{ id: "project-123" }, { id: "project-456" }],
      })

      expect(result).toBe("not_found")
    })

    it("returns 'not_found' when scopeProject is null and project not in userProjects", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: null,
        userProjects: [{ id: "project-123" }, { id: "project-456" }],
      })

      expect(result).toBe("not_found")
    })

    it("returns 'not_found' when scopeProject is undefined and userProjects is empty", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: undefined,
        userProjects: [],
      })

      expect(result).toBe("not_found")
    })

    it("returns 'not_found' when scopeProject is undefined and userProjects is null", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: undefined,
        userProjects: null,
      })

      expect(result).toBe("not_found")
    })

    it("returns 'not_found' when scopeProject is undefined and userProjects is undefined", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: undefined,
        userProjects: undefined,
      })

      expect(result).toBe("not_found")
    })

    it("returns 'not_found' when scopeProject has no id property and project not in userProjects", () => {
      const result = resolveProjectScope({
        projectId: "project-999",
        scopeProject: {},
        userProjects: [{ id: "project-123" }],
      })

      expect(result).toBe("not_found")
    })
  })

  describe("scope_failed status", () => {
    it("returns 'scope_failed' when project is in userProjects but scopeProject is undefined", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: undefined,
        userProjects: [{ id: "project-123" }, { id: "project-456" }],
      })

      expect(result).toBe("scope_failed")
    })

    it("returns 'scope_failed' when project is in userProjects but scopeProject is null", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: null,
        userProjects: [{ id: "project-123" }, { id: "project-456" }],
      })

      expect(result).toBe("scope_failed")
    })

    it("returns 'scope_failed' when project is in userProjects but scopeProject.id doesn't match", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: { id: "project-456" },
        userProjects: [{ id: "project-123" }, { id: "project-456" }],
      })

      expect(result).toBe("scope_failed")
    })

    it("returns 'scope_failed' when project is in userProjects but scopeProject has no id", () => {
      const result = resolveProjectScope({
        projectId: "project-123",
        scopeProject: {},
        userProjects: [{ id: "project-123" }, { id: "project-456" }],
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
        userProjects: [{ id: "project-123" }],
      })

      expect(validStatuses).toContain(result)
    })
  })
})

import { describe, it, expect } from "vitest"
import { parseFiltersFromUrl, buildFilterParams, buildUrlSearchParams } from "./urlHelpers"
import type { SelectedFilter, Filter } from "@/client/components/ListToolbar/types"

describe("parseFiltersFromUrl", () => {
  describe("returns empty array", () => {
    it("when no filter params are present", () => {
      const result = parseFiltersFromUrl({})
      expect(result).toEqual([])
    })

    it("when only search and sort params are present", () => {
      const result = parseFiltersFromUrl({
        search: "ubuntu",
        sortBy: "name",
        sortDirection: "asc",
      })
      expect(result).toEqual([])
    })
  })

  describe("parses single-value filters", () => {
    it("parses visibility filter", () => {
      const result = parseFiltersFromUrl({ visibility: "public" })
      expect(result).toEqual([{ name: "visibility", value: "public" }])
    })

    it("parses protected filter", () => {
      const result = parseFiltersFromUrl({ protected: "true" })
      expect(result).toEqual([{ name: "protected", value: "true" }])
    })

    it("parses single status value", () => {
      const result = parseFiltersFromUrl({ status: "active" })
      expect(result).toEqual([{ name: "status", value: "active" }])
    })
  })

  describe("parses multi-value filters with 'in:' prefix", () => {
    it("parses status filter with multiple values", () => {
      const result = parseFiltersFromUrl({ status: "in:active,queued,saving" })
      expect(result).toEqual([
        { name: "status", value: "active" },
        { name: "status", value: "queued" },
        { name: "status", value: "saving" },
      ])
    })

    it("parses disk_format filter with multiple values", () => {
      const result = parseFiltersFromUrl({ disk_format: "in:qcow2,raw,iso" })
      expect(result).toEqual([
        { name: "disk_format", value: "qcow2" },
        { name: "disk_format", value: "raw" },
        { name: "disk_format", value: "iso" },
      ])
    })

    it("parses container_format filter with multiple values", () => {
      const result = parseFiltersFromUrl({ container_format: "in:bare,ova" })
      expect(result).toEqual([
        { name: "container_format", value: "bare" },
        { name: "container_format", value: "ova" },
      ])
    })
  })

  describe("parses multiple filters together", () => {
    it("combines single and multi-value filters", () => {
      const result = parseFiltersFromUrl({
        status: "in:active,queued",
        visibility: "public",
        disk_format: "in:qcow2,raw",
      })
      expect(result).toEqual([
        { name: "status", value: "active" },
        { name: "status", value: "queued" },
        { name: "visibility", value: "public" },
        { name: "disk_format", value: "qcow2" },
        { name: "disk_format", value: "raw" },
      ])
    })

    it("parses all filter types at once", () => {
      const result = parseFiltersFromUrl({
        status: "in:active,queued",
        visibility: "public",
        disk_format: "qcow2",
        container_format: "in:bare,ova",
        protected: "false",
      })
      expect(result.length).toBe(7)
      expect(result).toContainEqual({ name: "status", value: "active" })
      expect(result).toContainEqual({ name: "status", value: "queued" })
      expect(result).toContainEqual({ name: "visibility", value: "public" })
      expect(result).toContainEqual({ name: "disk_format", value: "qcow2" })
      expect(result).toContainEqual({ name: "container_format", value: "bare" })
      expect(result).toContainEqual({ name: "container_format", value: "ova" })
      expect(result).toContainEqual({ name: "protected", value: "false" })
    })
  })
})

describe("buildFilterParams", () => {
  const mockFilterDefinitions: Filter[] = [
    { displayName: "Status", filterName: "status", values: ["active", "queued"], supportsMultiValue: true },
    { displayName: "Visibility", filterName: "visibility", values: ["public", "private"], supportsMultiValue: false },
    { displayName: "Disk Format", filterName: "disk_format", values: ["qcow2", "raw"], supportsMultiValue: true },
    { displayName: "Protected", filterName: "protected", values: ["true", "false"], supportsMultiValue: false },
  ]

  describe("returns empty object", () => {
    it("when selectedFilters is empty", () => {
      const result = buildFilterParams([], mockFilterDefinitions)
      expect(result).toEqual({})
    })

    it("when selectedFilters is undefined", () => {
      const result = buildFilterParams([], mockFilterDefinitions)
      expect(result).toEqual({})
    })
  })

  describe("builds single-value filter params", () => {
    it("builds visibility filter param", () => {
      const selectedFilters: SelectedFilter[] = [{ name: "visibility", value: "public" }]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({ visibility: "public" })
    })

    it("builds protected filter param", () => {
      const selectedFilters: SelectedFilter[] = [{ name: "protected", value: "true" }]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({ protected: "true" })
    })
  })

  describe("builds multi-value filter params with 'in:' syntax", () => {
    it("builds status filter with multiple values", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active" },
        { name: "status", value: "queued" },
        { name: "status", value: "saving" },
      ]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({ status: "in:active,queued,saving" })
    })

    it("builds disk_format filter with multiple values", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "disk_format", value: "qcow2" },
        { name: "disk_format", value: "raw" },
      ]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({ disk_format: "in:qcow2,raw" })
    })

    it("builds single value for multi-value filter", () => {
      const selectedFilters: SelectedFilter[] = [{ name: "status", value: "active" }]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({ status: "active" })
    })
  })

  describe("skips inactive filters", () => {
    it("excludes filters marked as inactive", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active" },
        { name: "status", value: "queued", inactive: true },
        { name: "visibility", value: "public" },
      ]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({
        status: "active",
        visibility: "public",
      })
    })

    it("excludes all filters if all are inactive", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active", inactive: true },
        { name: "visibility", value: "public", inactive: true },
      ]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({})
    })
  })

  describe("combines multiple filter types", () => {
    it("builds params with both single and multi-value filters", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active" },
        { name: "status", value: "queued" },
        { name: "visibility", value: "public" },
        { name: "protected", value: "false" },
      ]
      const result = buildFilterParams(selectedFilters, mockFilterDefinitions)
      expect(result).toEqual({
        status: "in:active,queued",
        visibility: "public",
        protected: "false",
      })
    })
  })
})

describe("buildUrlSearchParams", () => {
  const mockFilterDefinitions: Filter[] = [
    { displayName: "Status", filterName: "status", values: ["active", "queued"], supportsMultiValue: true },
    { displayName: "Visibility", filterName: "visibility", values: ["public", "private"], supportsMultiValue: false },
    { displayName: "Disk Format", filterName: "disk_format", values: ["qcow2", "raw"], supportsMultiValue: true },
  ]

  describe("preserves base params", () => {
    it("includes search, sortBy, and sortDirection from baseParams", () => {
      const result = buildUrlSearchParams([], mockFilterDefinitions, {
        search: "ubuntu",
        sortBy: "name",
        sortDirection: "asc",
      })
      expect(result).toEqual({
        search: "ubuntu",
        sortBy: "name",
        sortDirection: "asc",
      })
    })

    it("handles undefined base params", () => {
      const result = buildUrlSearchParams([], mockFilterDefinitions, {})
      expect(result).toEqual({
        search: undefined,
        sortBy: undefined,
        sortDirection: undefined,
      })
    })
  })

  describe("builds URL params with filters", () => {
    it("adds single-value filter to URL params", () => {
      const selectedFilters: SelectedFilter[] = [{ name: "visibility", value: "public" }]
      const result = buildUrlSearchParams(selectedFilters, mockFilterDefinitions, {
        search: "test",
        sortBy: "name",
        sortDirection: "desc",
      })
      expect(result).toEqual({
        search: "test",
        sortBy: "name",
        sortDirection: "desc",
        visibility: "public",
      })
    })

    it("adds multi-value filter with 'in:' syntax", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active" },
        { name: "status", value: "queued" },
      ]
      const result = buildUrlSearchParams(selectedFilters, mockFilterDefinitions, {
        sortBy: "created_at",
        sortDirection: "desc",
      })
      expect(result.status).toBe("in:active,queued")
    })

    it("combines multiple filter types in URL params", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active" },
        { name: "status", value: "queued" },
        { name: "visibility", value: "public" },
        { name: "disk_format", value: "qcow2" },
      ]
      const result = buildUrlSearchParams(selectedFilters, mockFilterDefinitions, {
        search: "ubuntu",
        sortBy: "name",
        sortDirection: "asc",
      })
      expect(result).toMatchObject({
        search: "ubuntu",
        sortBy: "name",
        sortDirection: "asc",
        status: "in:active,queued",
        visibility: "public",
        disk_format: "qcow2",
      })
    })
  })

  describe("skips inactive filters", () => {
    it("does not include inactive filters in URL params", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active" },
        { name: "status", value: "queued", inactive: true },
        { name: "visibility", value: "public" },
      ]
      const result = buildUrlSearchParams(selectedFilters, mockFilterDefinitions, {})
      expect(result.status).toBe("active")
      expect(result.visibility).toBe("public")
    })
  })

  describe("returns only base params when no active filters", () => {
    it("returns base params when selectedFilters is empty", () => {
      const result = buildUrlSearchParams([], mockFilterDefinitions, {
        search: "test",
        sortBy: "name",
        sortDirection: "asc",
      })
      expect(result).toEqual({
        search: "test",
        sortBy: "name",
        sortDirection: "asc",
      })
    })

    it("returns base params when all filters are inactive", () => {
      const selectedFilters: SelectedFilter[] = [
        { name: "status", value: "active", inactive: true },
        { name: "visibility", value: "public", inactive: true },
      ]
      const result = buildUrlSearchParams(selectedFilters, mockFilterDefinitions, {
        search: "test",
      })
      expect(result).toEqual({
        search: "test",
        sortBy: undefined,
        sortDirection: undefined,
      })
    })
  })
})

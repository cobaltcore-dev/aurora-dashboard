import { describe, it, expect } from "vitest"
import { parseFiltersFromUrl, buildFilterParams, applyFilterSelection, buildUrlSearchParams } from "./urlHelpers"
import type { SelectedFilter, Filter } from "@/client/components/ListToolbar/types"

const statusFilter: Filter = {
  displayName: "Status",
  filterName: "status",
  values: ["ACTIVE", "DOWN", "ERROR"],
  supportsMultiValue: true,
}

const visibilityFilter: Filter = {
  displayName: "Visibility",
  filterName: "visibility",
  values: ["public", "private"],
  supportsMultiValue: false,
}

const filterDefinitions: Filter[] = [statusFilter, visibilityFilter]

describe("parseFiltersFromUrl", () => {
  it("returns an empty array when no status is present", () => {
    expect(parseFiltersFromUrl({})).toEqual([])
  })

  it("maps a status search param to a SelectedFilter", () => {
    expect(parseFiltersFromUrl({ status: "ACTIVE" })).toEqual([{ name: "status", value: "ACTIVE" }])
  })

  it("ignores non-status params like search and sort", () => {
    expect(parseFiltersFromUrl({ search: "foo", sortBy: "status", sortDirection: "asc" })).toEqual([])
  })

  it("does not emit a filter for an empty status string", () => {
    expect(parseFiltersFromUrl({ status: "" })).toEqual([])
  })
})

describe("buildFilterParams", () => {
  it("returns an empty object when there are no selected filters", () => {
    expect(buildFilterParams([], filterDefinitions)).toEqual({})
  })

  it("returns an empty object when selectedFilters is undefined", () => {
    expect(buildFilterParams(undefined as unknown as SelectedFilter[], filterDefinitions)).toEqual({})
  })

  it("builds a single-value param", () => {
    const selected: SelectedFilter[] = [{ name: "status", value: "ACTIVE" }]
    expect(buildFilterParams(selected, filterDefinitions)).toEqual({ status: "ACTIVE" })
  })

  it("combines multiple values with the in: operator when the filter supports multi-value", () => {
    const selected: SelectedFilter[] = [
      { name: "status", value: "ACTIVE" },
      { name: "status", value: "DOWN" },
    ]
    expect(buildFilterParams(selected, filterDefinitions)).toEqual({ status: "in:ACTIVE,DOWN" })
  })

  it("uses the first value only when the filter does not support multi-value", () => {
    const selected: SelectedFilter[] = [
      { name: "visibility", value: "public" },
      { name: "visibility", value: "private" },
    ]
    expect(buildFilterParams(selected, filterDefinitions)).toEqual({ visibility: "public" })
  })

  it("does not use in: for a multi-value filter with only one selection", () => {
    const selected: SelectedFilter[] = [{ name: "status", value: "ACTIVE" }]
    expect(buildFilterParams(selected, filterDefinitions)).toEqual({ status: "ACTIVE" })
  })

  it("skips inactive filters", () => {
    const selected: SelectedFilter[] = [
      { name: "status", value: "ACTIVE", inactive: true },
      { name: "status", value: "DOWN" },
    ]
    expect(buildFilterParams(selected, filterDefinitions)).toEqual({ status: "DOWN" })
  })

  it("groups multiple distinct filter names independently", () => {
    const selected: SelectedFilter[] = [
      { name: "status", value: "ACTIVE" },
      { name: "visibility", value: "public" },
    ]
    expect(buildFilterParams(selected, filterDefinitions)).toEqual({
      status: "ACTIVE",
      visibility: "public",
    })
  })
})

describe("applyFilterSelection", () => {
  it("adds a selection to an empty list", () => {
    const result = applyFilterSelection([], { name: "status", value: "ACTIVE" }, filterDefinitions)
    expect(result).toEqual([{ name: "status", value: "ACTIVE" }])
  })

  it("ignores an exact duplicate (same name and value)", () => {
    const current: SelectedFilter[] = [{ name: "status", value: "ACTIVE" }]
    const result = applyFilterSelection(current, { name: "status", value: "ACTIVE" }, filterDefinitions)
    expect(result).toBe(current)
  })

  it("appends a new value for a multi-value filter", () => {
    const current: SelectedFilter[] = [{ name: "status", value: "ACTIVE" }]
    const result = applyFilterSelection(current, { name: "status", value: "DOWN" }, filterDefinitions)
    expect(result).toEqual([
      { name: "status", value: "ACTIVE" },
      { name: "status", value: "DOWN" },
    ])
  })

  it("replaces the existing entry for a single-value filter", () => {
    const current: SelectedFilter[] = [{ name: "visibility", value: "public" }]
    const result = applyFilterSelection(current, { name: "visibility", value: "private" }, filterDefinitions)
    expect(result).toEqual([{ name: "visibility", value: "private" }])
  })

  it("replacing a single-value filter preserves other filter names", () => {
    const current: SelectedFilter[] = [
      { name: "status", value: "ACTIVE" },
      { name: "visibility", value: "public" },
    ]
    const result = applyFilterSelection(current, { name: "visibility", value: "private" }, filterDefinitions)
    expect(result).toEqual([
      { name: "status", value: "ACTIVE" },
      { name: "visibility", value: "private" },
    ])
  })
})

describe("buildUrlSearchParams", () => {
  const baseParams = { search: "foo", sortBy: "status", sortDirection: "asc" as const }

  it("passes through base params when there are no selected filters", () => {
    expect(buildUrlSearchParams([], filterDefinitions, baseParams)).toEqual({
      search: "foo",
      sortBy: "status",
      sortDirection: "asc",
    })
  })

  it("returns only base params when selectedFilters is undefined", () => {
    expect(buildUrlSearchParams(undefined as unknown as SelectedFilter[], filterDefinitions, baseParams)).toEqual({
      search: "foo",
      sortBy: "status",
      sortDirection: "asc",
    })
  })

  it("adds a single-value filter alongside base params", () => {
    const selected: SelectedFilter[] = [{ name: "status", value: "ACTIVE" }]
    expect(buildUrlSearchParams(selected, filterDefinitions, baseParams)).toEqual({
      search: "foo",
      sortBy: "status",
      sortDirection: "asc",
      status: "ACTIVE",
    })
  })

  it("combines multiple values with the in: operator for a multi-value filter", () => {
    const selected: SelectedFilter[] = [
      { name: "status", value: "ACTIVE" },
      { name: "status", value: "DOWN" },
    ]
    expect(buildUrlSearchParams(selected, filterDefinitions, {})).toMatchObject({
      status: "in:ACTIVE,DOWN",
    })
  })

  it("uses the first value for a single-value filter with multiple selections", () => {
    const selected: SelectedFilter[] = [
      { name: "visibility", value: "public" },
      { name: "visibility", value: "private" },
    ]
    expect(buildUrlSearchParams(selected, filterDefinitions, {})).toMatchObject({
      visibility: "public",
    })
  })

  it("skips inactive filters", () => {
    const selected: SelectedFilter[] = [{ name: "status", value: "ACTIVE", inactive: true }]
    const result = buildUrlSearchParams(selected, filterDefinitions, baseParams)
    expect(result).not.toHaveProperty("status")
  })
})

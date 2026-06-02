import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { useListWithFiltering, UseListWithFilteringOptions } from "./useListWithFiltering"

describe("useListWithFiltering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Initialization", () => {
    it("initializes with default values (FloatingIps scenario)", () => {
      const options: UseListWithFilteringOptions<"fixed_ip_address" | "floating_ip_address" | "status"> = {
        defaultSortKey: "fixed_ip_address",
        defaultSortDir: "asc",
        sortOptions: [
          { label: "Fixed IP Address", value: "fixed_ip_address" },
          { label: "Floating IP Address", value: "floating_ip_address" },
          { label: "Status", value: "status" },
        ],
        filterSettings: {
          filters: [
            {
              displayName: "Status",
              filterName: "status",
              values: ["ACTIVE", "DOWN", "ERROR"],
              supportsMultiValue: false,
            },
          ],
        },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      expect(result.current.searchTerm).toBe("")
      expect(result.current.sortSettings.sortBy).toBe("fixed_ip_address")
      expect(result.current.sortSettings.sortDirection).toBe("asc")
      expect(result.current.sortSettings.options).toHaveLength(3)
      expect(result.current.filterSettings.filters).toHaveLength(1)
      expect(result.current.filterSettings.filters[0].filterName).toBe("status")
    })

    it("initializes with default values (SecurityGroups scenario)", () => {
      const options: UseListWithFilteringOptions<"name" | "project_id"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [
          { label: "Name", value: "name" },
          { label: "Project id", value: "project_id" },
        ],
        filterSettings: {
          filters: [
            {
              displayName: "Shared",
              filterName: "shared",
              values: ["true", "false"],
              supportsMultiValue: false,
            },
          ],
        },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      expect(result.current.searchTerm).toBe("")
      expect(result.current.sortSettings.sortBy).toBe("name")
      expect(result.current.sortSettings.sortDirection).toBe("asc")
      expect(result.current.sortSettings.options).toHaveLength(2)
      expect(result.current.filterSettings.filters).toHaveLength(1)
      expect(result.current.filterSettings.filters[0].filterName).toBe("shared")
    })

    it("initializes with descending sort direction", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "desc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      expect(result.current.sortSettings.sortDirection).toBe("desc")
    })

    it("initializes with empty filter settings", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      expect(result.current.filterSettings.filters).toEqual([])
      expect(result.current.filterSettings.selectedFilters).toBeUndefined()
    })
  })

  describe("Search term handling", () => {
    it("updates search term with string value", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      act(() => {
        result.current.handleSearchChange("test search")
      })

      expect(result.current.searchTerm).toBe("test search")
    })

    it("handles empty string search term", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      act(() => {
        result.current.handleSearchChange("test")
      })

      expect(result.current.searchTerm).toBe("test")

      act(() => {
        result.current.handleSearchChange("")
      })

      expect(result.current.searchTerm).toBe("")
    })

    it("converts undefined to empty string", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      act(() => {
        result.current.handleSearchChange(undefined)
      })

      expect(result.current.searchTerm).toBe("")
    })

    it("converts number to empty string", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      act(() => {
        result.current.handleSearchChange(123)
      })

      expect(result.current.searchTerm).toBe("")
    })

    it("converts array to empty string", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      act(() => {
        result.current.handleSearchChange(["test", "value"])
      })

      expect(result.current.searchTerm).toBe("")
    })

    it("handles consecutive search term updates", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      act(() => {
        result.current.handleSearchChange("first")
      })
      expect(result.current.searchTerm).toBe("first")

      act(() => {
        result.current.handleSearchChange("second")
      })
      expect(result.current.searchTerm).toBe("second")

      act(() => {
        result.current.handleSearchChange("third")
      })
      expect(result.current.searchTerm).toBe("third")
    })
  })

  describe("Sort settings handling", () => {
    it("updates sort key (FloatingIps scenario)", () => {
      const options: UseListWithFilteringOptions<"fixed_ip_address" | "floating_ip_address" | "status"> = {
        defaultSortKey: "fixed_ip_address",
        defaultSortDir: "asc",
        sortOptions: [
          { label: "Fixed IP Address", value: "fixed_ip_address" },
          { label: "Floating IP Address", value: "floating_ip_address" },
          { label: "Status", value: "status" },
        ],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newSortSettings: SortSettings = {
        options: options.sortOptions,
        sortBy: "floating_ip_address",
        sortDirection: "asc",
      }

      act(() => {
        result.current.handleSortChange(newSortSettings)
      })

      expect(result.current.sortSettings.sortBy).toBe("floating_ip_address")
      expect(result.current.sortSettings.sortDirection).toBe("asc")
    })

    it("updates sort direction", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newSortSettings: SortSettings = {
        options: options.sortOptions,
        sortBy: "name",
        sortDirection: "desc",
      }

      act(() => {
        result.current.handleSortChange(newSortSettings)
      })

      expect(result.current.sortSettings.sortDirection).toBe("desc")
      expect(result.current.sortSettings.sortBy).toBe("name")
    })

    it("updates both sort key and direction (SecurityGroups scenario)", () => {
      const options: UseListWithFilteringOptions<"name" | "project_id"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [
          { label: "Name", value: "name" },
          { label: "Project id", value: "project_id" },
        ],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newSortSettings: SortSettings = {
        options: options.sortOptions,
        sortBy: "project_id",
        sortDirection: "desc",
      }

      act(() => {
        result.current.handleSortChange(newSortSettings)
      })

      expect(result.current.sortSettings.sortBy).toBe("project_id")
      expect(result.current.sortSettings.sortDirection).toBe("desc")
    })

    it("preserves existing options when updating sort settings", () => {
      const sortOptions = [
        { label: "Name", value: "name" },
        { label: "Created", value: "created_at" },
      ]

      const options: UseListWithFilteringOptions<"name" | "created_at"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions,
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newSortSettings: SortSettings = {
        options: options.sortOptions,
        sortBy: "created_at",
        sortDirection: "desc",
      }

      act(() => {
        result.current.handleSortChange(newSortSettings)
      })

      expect(result.current.sortSettings.options).toEqual(sortOptions)
    })

    it("falls back to default sort key when sortBy is undefined", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newSortSettings: SortSettings = {
        options: options.sortOptions,
        sortBy: undefined,
        sortDirection: "desc",
      }

      act(() => {
        result.current.handleSortChange(newSortSettings)
      })

      expect(result.current.sortSettings.sortBy).toBe("name")
    })

    it("falls back to default sort direction when sortDirection is undefined", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "desc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newSortSettings: SortSettings = {
        options: options.sortOptions,
        sortBy: "name",
        sortDirection: undefined,
      }

      act(() => {
        result.current.handleSortChange(newSortSettings)
      })

      expect(result.current.sortSettings.sortDirection).toBe("desc")
    })

    it("allows updating options in sort settings", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newOptions = [
        { label: "Name", value: "name" },
        { label: "Size", value: "size" },
      ]

      const newSortSettings: SortSettings = {
        sortBy: "name",
        sortDirection: "asc",
        options: newOptions,
      }

      act(() => {
        result.current.handleSortChange(newSortSettings)
      })

      expect(result.current.sortSettings.options).toEqual(newOptions)
    })
  })

  describe("Filter settings handling", () => {
    it("updates filter settings with selected filters (FloatingIps status filter)", () => {
      const initialFilters = {
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
      }

      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: initialFilters,
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newFilterSettings: FilterSettings = {
        filters: initialFilters.filters,
        selectedFilters: [{ name: "status", value: "ACTIVE" }],
      }

      act(() => {
        result.current.handleFilterChange(newFilterSettings)
      })

      expect(result.current.filterSettings.selectedFilters).toHaveLength(1)
      expect(result.current.filterSettings.selectedFilters?.[0]).toEqual({
        name: "status",
        value: "ACTIVE",
      })
    })

    it("updates filter settings with boolean filter (SecurityGroups shared filter)", () => {
      const initialFilters = {
        filters: [
          {
            displayName: "Shared",
            filterName: "shared",
            values: ["true", "false"],
            supportsMultiValue: false,
          },
        ],
      }

      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: initialFilters,
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newFilterSettings: FilterSettings = {
        filters: initialFilters.filters,
        selectedFilters: [{ name: "shared", value: "true" }],
      }

      act(() => {
        result.current.handleFilterChange(newFilterSettings)
      })

      expect(result.current.filterSettings.selectedFilters).toHaveLength(1)
      expect(result.current.filterSettings.selectedFilters?.[0]).toEqual({
        name: "shared",
        value: "true",
      })
    })

    it("clears selected filters", () => {
      const initialFilters = {
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
        selectedFilters: [{ name: "status", value: "ACTIVE" }],
      }

      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: initialFilters,
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      expect(result.current.filterSettings.selectedFilters).toHaveLength(1)

      const newFilterSettings: FilterSettings = {
        filters: initialFilters.filters,
        selectedFilters: [],
      }

      act(() => {
        result.current.handleFilterChange(newFilterSettings)
      })

      expect(result.current.filterSettings.selectedFilters).toEqual([])
    })

    it("handles multiple selected filters", () => {
      const initialFilters = {
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
      }

      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: initialFilters,
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newFilterSettings: FilterSettings = {
        filters: initialFilters.filters,
        selectedFilters: [
          { name: "status", value: "ACTIVE" },
          { name: "project_id", value: "proj-123" },
        ],
      }

      act(() => {
        result.current.handleFilterChange(newFilterSettings)
      })

      expect(result.current.filterSettings.selectedFilters).toHaveLength(2)
    })

    it("handles inactive filters", () => {
      const initialFilters = {
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
      }

      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: initialFilters,
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newFilterSettings: FilterSettings = {
        filters: initialFilters.filters,
        selectedFilters: [{ name: "status", value: "ACTIVE", inactive: true }],
      }

      act(() => {
        result.current.handleFilterChange(newFilterSettings)
      })

      expect(result.current.filterSettings.selectedFilters?.[0].inactive).toBe(true)
    })

    it("updates filter definitions", () => {
      const initialFilters = {
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN"],
            supportsMultiValue: false,
          },
        ],
      }

      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: initialFilters,
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      const newFilterSettings: FilterSettings = {
        filters: [
          {
            displayName: "Status",
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
      }

      act(() => {
        result.current.handleFilterChange(newFilterSettings)
      })

      expect(result.current.filterSettings.filters[0].values).toHaveLength(3)
    })
  })

  describe("Combined state updates", () => {
    it("handles search, sort, and filter updates independently", () => {
      const options: UseListWithFilteringOptions<"name" | "status"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [
          { label: "Name", value: "name" },
          { label: "Status", value: "status" },
        ],
        filterSettings: {
          filters: [
            {
              displayName: "Status",
              filterName: "status",
              values: ["ACTIVE", "DOWN"],
              supportsMultiValue: false,
            },
          ],
        },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      // Update search
      act(() => {
        result.current.handleSearchChange("test")
      })
      expect(result.current.searchTerm).toBe("test")

      // Update sort
      act(() => {
        result.current.handleSortChange({
          options: options.sortOptions,
          sortBy: "status",
          sortDirection: "desc",
        })
      })
      expect(result.current.sortSettings.sortBy).toBe("status")
      expect(result.current.sortSettings.sortDirection).toBe("desc")

      // Update filter
      act(() => {
        result.current.handleFilterChange({
          filters: options.filterSettings.filters,
          selectedFilters: [{ name: "status", value: "ACTIVE" }],
        })
      })
      expect(result.current.filterSettings.selectedFilters).toHaveLength(1)

      // Verify all states are maintained
      expect(result.current.searchTerm).toBe("test")
      expect(result.current.sortSettings.sortBy).toBe("status")
      expect(result.current.filterSettings.selectedFilters?.[0].value).toBe("ACTIVE")
    })

    it("handles real-world FloatingIps scenario", () => {
      const options: UseListWithFilteringOptions<
        "fixed_ip_address" | "floating_ip_address" | "floating_network_id" | "id" | "router_id" | "status"
      > = {
        defaultSortKey: "fixed_ip_address",
        defaultSortDir: "asc",
        sortOptions: [
          { label: "Fixed IP Address", value: "fixed_ip_address" },
          { label: "Floating IP Address", value: "floating_ip_address" },
          { label: "Floating Network ID", value: "floating_network_id" },
          { label: "ID", value: "id" },
          { label: "Router ID", value: "router_id" },
          { label: "Status", value: "status" },
        ],
        filterSettings: {
          filters: [
            {
              displayName: "Status",
              filterName: "status",
              values: ["ACTIVE", "DOWN", "ERROR"],
              supportsMultiValue: false,
            },
          ],
        },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      // Simulate user selecting a status filter
      act(() => {
        result.current.handleFilterChange({
          filters: options.filterSettings.filters,
          selectedFilters: [{ name: "status", value: "DOWN" }],
        })
      })

      // Simulate user changing sort to floating_ip_address descending
      act(() => {
        result.current.handleSortChange({
          options: options.sortOptions,
          sortBy: "floating_ip_address",
          sortDirection: "desc",
        })
      })

      // Simulate user entering search term
      act(() => {
        result.current.handleSearchChange("192.168")
      })

      expect(result.current.searchTerm).toBe("192.168")
      expect(result.current.sortSettings.sortBy).toBe("floating_ip_address")
      expect(result.current.sortSettings.sortDirection).toBe("desc")
      expect(result.current.filterSettings.selectedFilters?.[0]).toEqual({
        name: "status",
        value: "DOWN",
      })
    })

    it("handles real-world SecurityGroups scenario", () => {
      const options: UseListWithFilteringOptions<"name" | "project_id"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [
          { label: "Name", value: "name" },
          { label: "Project id", value: "project_id" },
        ],
        filterSettings: {
          filters: [
            {
              displayName: "Shared",
              filterName: "shared",
              values: ["true", "false"],
              supportsMultiValue: false,
            },
          ],
        },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      // Simulate user selecting shared filter
      act(() => {
        result.current.handleFilterChange({
          filters: options.filterSettings.filters,
          selectedFilters: [{ name: "shared", value: "false" }],
        })
      })

      // Simulate user changing sort to project_id
      act(() => {
        result.current.handleSortChange({
          options: options.sortOptions,
          sortBy: "project_id",
          sortDirection: "asc",
        })
      })

      // Simulate user entering search term
      act(() => {
        result.current.handleSearchChange("web-server")
      })

      expect(result.current.searchTerm).toBe("web-server")
      expect(result.current.sortSettings.sortBy).toBe("project_id")
      expect(result.current.sortSettings.sortDirection).toBe("asc")
      expect(result.current.filterSettings.selectedFilters?.[0]).toEqual({
        name: "shared",
        value: "false",
      })
    })
  })

  describe("Return value structure", () => {
    it("returns all required properties", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      expect(result.current).toHaveProperty("searchTerm")
      expect(result.current).toHaveProperty("sortSettings")
      expect(result.current).toHaveProperty("filterSettings")
      expect(result.current).toHaveProperty("handleSearchChange")
      expect(result.current).toHaveProperty("handleSortChange")
      expect(result.current).toHaveProperty("handleFilterChange")
    })

    it("returns functions that can be called", () => {
      const options: UseListWithFilteringOptions<"name"> = {
        defaultSortKey: "name",
        defaultSortDir: "asc",
        sortOptions: [{ label: "Name", value: "name" }],
        filterSettings: { filters: [] },
      }

      const { result } = renderHook(() => useListWithFiltering(options))

      expect(typeof result.current.handleSearchChange).toBe("function")
      expect(typeof result.current.handleSortChange).toBe("function")
      expect(typeof result.current.handleFilterChange).toBe("function")
    })
  })
})

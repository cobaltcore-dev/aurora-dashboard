import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useBucketSearch } from "./useBucketSearch"

// Helper to generate mock buckets for testing
const generateMockBuckets = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `bucket-${String(i + 1).padStart(3, "0")}`,
  }))
}

describe("useBucketSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("initial state", () => {
    it("should initialize with empty search term", () => {
      const { result } = renderHook(() => useBucketSearch([]))

      expect(result.current.searchTerm).toBe("")
      expect(result.current.debouncedSearch).toBe("")
    })

    it("should initialize with visible buckets when no search (up to max)", () => {
      const buckets = generateMockBuckets(10)
      const { result } = renderHook(() => useBucketSearch(buckets))

      expect(result.current.visibleBuckets).toEqual(buckets)
      expect(result.current.hiddenCount).toBe(0)
    })
  })

  describe("search filtering", () => {
    const buckets = [
      { name: "alpha-bucket" },
      { name: "beta-bucket" },
      { name: "gamma-test" },
      { name: "test-alpha" },
      { name: "production-db" },
    ]

    it("should filter buckets by search term (case-insensitive)", () => {
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "alpha" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.debouncedSearch).toBe("alpha")
      expect(result.current.visibleBuckets).toHaveLength(2)
      expect(result.current.visibleBuckets.map((b) => b.name)).toEqual(["alpha-bucket", "test-alpha"])
    })

    it("should be case-insensitive", () => {
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "TEST" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toHaveLength(2)
      expect(result.current.visibleBuckets.map((b) => b.name)).toContain("gamma-test")
      expect(result.current.visibleBuckets.map((b) => b.name)).toContain("test-alpha")
    })

    it("should filter by partial match", () => {
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "buck" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toHaveLength(2)
      expect(result.current.visibleBuckets.map((b) => b.name)).toEqual(["alpha-bucket", "beta-bucket"])
    })

    it("should return empty array when no matches", () => {
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "nonexistent" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toHaveLength(0)
    })

    it("should handle undefined buckets array", () => {
      const { result } = renderHook(() => useBucketSearch(undefined))

      act(() => {
        const event = { target: { value: "test" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toEqual([])
    })
  })

  describe("debounce behavior", () => {
    it("should debounce search input by 300ms", () => {
      const buckets = [{ name: "test-bucket" }]
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "test" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      // Immediately after input, searchTerm updated but debouncedSearch not yet
      expect(result.current.searchTerm).toBe("test")
      expect(result.current.debouncedSearch).toBe("")

      // Advance time by 299ms (just before debounce)
      act(() => {
        vi.advanceTimersByTime(299)
      })

      expect(result.current.debouncedSearch).toBe("")

      // Advance final 1ms to trigger debounce
      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(result.current.debouncedSearch).toBe("test")
    })

    it("should cancel previous debounce timer on rapid input", () => {
      const buckets = [{ name: "test-bucket" }]
      const { result } = renderHook(() => useBucketSearch(buckets))

      // First input
      act(() => {
        const event = { target: { value: "t" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      // Advance 100ms
      act(() => {
        vi.advanceTimersByTime(100)
      })

      // Second input before debounce completes
      act(() => {
        const event = { target: { value: "te" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      // Advance another 100ms
      act(() => {
        vi.advanceTimersByTime(100)
      })

      // Third input
      act(() => {
        const event = { target: { value: "test" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      // Now advance full 300ms
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should only see the last value
      expect(result.current.debouncedSearch).toBe("test")
      expect(result.current.searchTerm).toBe("test")
    })

    it("should cleanup debounce timer on unmount", () => {
      const { result, unmount } = renderHook(() => useBucketSearch([]))

      act(() => {
        const event = { target: { value: "test" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      // Unmount before debounce completes
      unmount()

      // Advance timers - should not throw error
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // No assertion needed - just verify no errors thrown
    })
  })

  describe("result limiting", () => {
    it("should limit visible buckets to 50 items", () => {
      const buckets = generateMockBuckets(100)
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "bucket" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toHaveLength(50)
      expect(result.current.hiddenCount).toBe(50)
    })

    it("should not limit when results are below 50", () => {
      const buckets = generateMockBuckets(30)
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "bucket" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toHaveLength(30)
      expect(result.current.hiddenCount).toBe(0)
    })

    it("should calculate hiddenCount correctly", () => {
      const buckets = generateMockBuckets(75)
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "bucket" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toHaveLength(50)
      expect(result.current.hiddenCount).toBe(25)
    })
  })

  describe("reset", () => {
    it("should reset search term and debounced search", () => {
      const buckets = [{ name: "test-bucket" }]
      const { result } = renderHook(() => useBucketSearch(buckets))

      // Set search
      act(() => {
        const event = { target: { value: "test" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.searchTerm).toBe("test")
      expect(result.current.debouncedSearch).toBe("test")

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.searchTerm).toBe("")
      expect(result.current.debouncedSearch).toBe("")
      expect(result.current.visibleBuckets).toEqual([{ name: "test-bucket" }])
      expect(result.current.hiddenCount).toBe(0)
    })

    it("should cancel pending debounce timer on reset", () => {
      const buckets = [{ name: "test-bucket" }]
      const { result } = renderHook(() => useBucketSearch(buckets))

      // Start typing
      act(() => {
        const event = { target: { value: "test" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      // Reset before debounce completes
      act(() => {
        result.current.reset()
      })

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should remain empty
      expect(result.current.debouncedSearch).toBe("")
    })
  })

  describe("edge cases", () => {
    it("should handle empty string search", () => {
      const buckets = [{ name: "test" }]
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toEqual([{ name: "test" }])
    })

    it("should handle whitespace-only search", () => {
      const buckets = [{ name: "test" }]
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "   " } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toEqual([{ name: "test" }])
    })

    it("should handle special characters in search", () => {
      const buckets = [{ name: "test-bucket_2024" }, { name: "prod.bucket" }]
      const { result } = renderHook(() => useBucketSearch(buckets))

      act(() => {
        const event = { target: { value: "_2024" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toHaveLength(1)
      expect(result.current.visibleBuckets[0].name).toBe("test-bucket_2024")
    })

    it("should handle empty buckets array", () => {
      const { result } = renderHook(() => useBucketSearch([]))

      act(() => {
        const event = { target: { value: "test" } } as React.ChangeEvent<HTMLInputElement>
        result.current.handleSearchChange(event)
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current.visibleBuckets).toEqual([])
      expect(result.current.hiddenCount).toBe(0)
    })
  })
})

import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useLocalFolders } from "./useLocalFolders"

describe("useLocalFolders", () => {
  describe("initial state", () => {
    it("should initialize with empty folders record", () => {
      const { result } = renderHook(() => useLocalFolders())

      expect(result.current.localFolders).toEqual({})
    })
  })

  describe("addFolder", () => {
    it("should add folder to specific bucket", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/")
      })

      expect(result.current.localFolders["bucket-1"]).toEqual(["documents/"])
    })

    it("should add multiple folders to same bucket", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/")
        result.current.addFolder("bucket-1", "images/")
      })

      expect(result.current.localFolders["bucket-1"]).toEqual(["documents/", "images/"])
    })

    it("should handle folders in different buckets independently", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/")
        result.current.addFolder("bucket-2", "images/")
      })

      expect(result.current.localFolders["bucket-1"]).toEqual(["documents/"])
      expect(result.current.localFolders["bucket-2"]).toEqual(["images/"])
    })

    it("should preserve existing folders when adding new ones", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "folder-a/")
        result.current.addFolder("bucket-1", "folder-b/")
        result.current.addFolder("bucket-1", "folder-c/")
      })

      expect(result.current.localFolders["bucket-1"]).toHaveLength(3)
      expect(result.current.localFolders["bucket-1"]).toContain("folder-a/")
      expect(result.current.localFolders["bucket-1"]).toContain("folder-b/")
      expect(result.current.localFolders["bucket-1"]).toContain("folder-c/")
    })

    it("should handle nested folder paths", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/reports/2024/")
      })

      expect(result.current.localFolders["bucket-1"]).toEqual(["documents/reports/2024/"])
    })
  })

  describe("clearForBucket", () => {
    it("should clear folders for specific bucket", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/")
        result.current.addFolder("bucket-1", "images/")
      })

      act(() => {
        result.current.clearForBucket("bucket-1")
      })

      expect(result.current.localFolders["bucket-1"]).toBeUndefined()
    })

    it("should not affect other buckets when clearing", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/")
        result.current.addFolder("bucket-2", "images/")
      })

      act(() => {
        result.current.clearForBucket("bucket-1")
      })

      expect(result.current.localFolders["bucket-1"]).toBeUndefined()
      expect(result.current.localFolders["bucket-2"]).toEqual(["images/"])
    })

    it("should handle clearing non-existent bucket gracefully", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.clearForBucket("non-existent-bucket")
      })

      expect(result.current.localFolders).toEqual({})
    })
  })

  describe("reset", () => {
    it("should reset all folders", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/")
        result.current.addFolder("bucket-2", "images/")
        result.current.addFolder("bucket-3", "videos/")
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.localFolders).toEqual({})
    })

    it("should allow adding folders after reset", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "old-folder/")
        result.current.reset()
        result.current.addFolder("bucket-1", "new-folder/")
      })

      expect(result.current.localFolders["bucket-1"]).toEqual(["new-folder/"])
    })
  })

  describe("bucket isolation", () => {
    it("should maintain isolation between buckets", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-a", "folder-1/")
        result.current.addFolder("bucket-b", "folder-2/")
        result.current.addFolder("bucket-c", "folder-3/")
      })

      // Verify each bucket has only its own folders
      expect(result.current.localFolders["bucket-a"]).toEqual(["folder-1/"])
      expect(result.current.localFolders["bucket-b"]).toEqual(["folder-2/"])
      expect(result.current.localFolders["bucket-c"]).toEqual(["folder-3/"])

      // Clear one bucket
      act(() => {
        result.current.clearForBucket("bucket-b")
      })

      // Other buckets unaffected
      expect(result.current.localFolders["bucket-a"]).toEqual(["folder-1/"])
      expect(result.current.localFolders["bucket-b"]).toBeUndefined()
      expect(result.current.localFolders["bucket-c"]).toEqual(["folder-3/"])
    })
  })

  describe("edge cases", () => {
    it("should handle empty bucket name", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("", "folder/")
      })

      expect(result.current.localFolders[""]).toEqual(["folder/"])
    })

    it("should handle empty folder path", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "")
      })

      expect(result.current.localFolders["bucket-1"]).toEqual([""])
    })

    it("should allow duplicate folder paths in same bucket", () => {
      const { result } = renderHook(() => useLocalFolders())

      act(() => {
        result.current.addFolder("bucket-1", "documents/")
        result.current.addFolder("bucket-1", "documents/")
      })

      // No deduplication - hook just stores what's added
      expect(result.current.localFolders["bucket-1"]).toEqual(["documents/", "documents/"])
    })
  })
})

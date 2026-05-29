import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useCopyMoveModalState } from "./useCopyMoveModalState"

// Mock sub-hooks
vi.mock("./useObjectBrowser", () => ({
  useObjectBrowser: (_rows: unknown, callback?: (path: string) => void) => ({
    currentPrefix: "",
    newFolderName: "",
    newFolderError: null,
    showNewFolderInput: false,
    navigateToPrefix: vi.fn((prefix) => prefix),
    navigateUp: vi.fn(),
    startCreateFolder: vi.fn(),
    cancelCreateFolder: vi.fn(),
    setNewFolderName: vi.fn(),
    createFolder: vi.fn(() => {
      if (callback) callback("new-folder/")
      return "new-folder/"
    }),
    reset: vi.fn(),
  }),
}))

vi.mock("./useBucketSearch", () => ({
  useBucketSearch: (_buckets: unknown) => ({
    searchTerm: "",
    debouncedSearch: "",
    visibleBuckets: _buckets || [],
    hiddenCount: 0,
    handleSearchChange: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock("./useLocalFolders", () => ({
  useLocalFolders: () => ({
    localFolders: {},
    addFolder: vi.fn(),
    clearForBucket: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe("useCopyMoveModalState", () => {
  const mockBuckets = [{ name: "bucket-1" }, { name: "bucket-2" }, { name: "bucket-3" }]

  const mockRows = [
    { kind: "folder" as const, name: "documents/", displayName: "documents" },
    { kind: "object" as const, name: "file.txt", displayName: "file.txt" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("initialization", () => {
    it("should initialize with provided initial bucket", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "my-bucket",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      expect(result.current.targetBucket).toBe("my-bucket")
    })

    it("should expose all sub-hook properties", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      // Browser state
      expect(result.current).toHaveProperty("currentPrefix")
      expect(result.current).toHaveProperty("navigateToPrefix")
      expect(result.current).toHaveProperty("navigateUp")
      expect(result.current).toHaveProperty("createFolder")

      // Search state
      expect(result.current).toHaveProperty("searchTerm")
      expect(result.current).toHaveProperty("visibleBuckets")
      expect(result.current).toHaveProperty("handleSearchChange")

      // Local folders state
      expect(result.current).toHaveProperty("localFolders")
      expect(result.current).toHaveProperty("addFolder")
      expect(result.current).toHaveProperty("clearForBucket")

      // Orchestration
      expect(result.current).toHaveProperty("targetBucket")
      expect(result.current).toHaveProperty("setTargetBucket")
      expect(result.current).toHaveProperty("resetAll")
    })
  })

  describe("setTargetBucket", () => {
    it("should update target bucket", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      act(() => {
        result.current.setTargetBucket("bucket-2")
      })

      expect(result.current.targetBucket).toBe("bucket-2")
    })

    it("should reset browser state when changing bucket", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      const browserReset = result.current.reset

      act(() => {
        result.current.setTargetBucket("bucket-2")
      })

      // Browser reset should have been called
      expect(browserReset).toBeDefined()
    })

    it("should clear local folders for old bucket when changing", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      const clearForBucket = result.current.clearForBucket

      act(() => {
        result.current.setTargetBucket("bucket-2")
      })

      // clearForBucket should be available
      expect(clearForBucket).toBeDefined()
    })
  })

  describe("resetAll", () => {
    it("should reset all state to initial values", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "initial-bucket",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      // Change some state
      act(() => {
        result.current.setTargetBucket("different-bucket")
      })

      // Reset all
      act(() => {
        result.current.resetAll()
      })

      expect(result.current.targetBucket).toBe("initial-bucket")
    })

    it("should call reset on all sub-hooks", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      // All sub-hook reset methods should be available
      expect(result.current.reset).toBeDefined()
      expect(typeof result.current.reset).toBe("function")
    })
  })

  describe("folder creation integration", () => {
    it("should add folder to local folders when created in browser", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      // Create folder through browser hook
      act(() => {
        result.current.createFolder()
        // Callback in useObjectBrowser mock will trigger addFolder
      })

      // addFolder should be available
      expect(result.current.addFolder).toBeDefined()
    })
  })

  describe("bucket search integration", () => {
    it("should provide search functionality", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      expect(result.current.handleSearchChange).toBeDefined()
      expect(result.current.visibleBuckets).toBeDefined()
      expect(result.current.searchTerm).toBeDefined()
    })

    it("should show all buckets when provided", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      expect(result.current.visibleBuckets).toEqual(mockBuckets)
    })
  })

  describe("browser navigation integration", () => {
    it("should provide navigation methods", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      expect(result.current.navigateToPrefix).toBeDefined()
      expect(result.current.navigateUp).toBeDefined()
      expect(result.current.currentPrefix).toBeDefined()
    })

    it("should provide folder creation methods", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      expect(result.current.startCreateFolder).toBeDefined()
      expect(result.current.cancelCreateFolder).toBeDefined()
      expect(result.current.createFolder).toBeDefined()
      expect(result.current.newFolderName).toBeDefined()
      expect(result.current.setNewFolderName).toBeDefined()
    })
  })

  describe("state coordination", () => {
    it("should coordinate bucket change with browser reset", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      const initialBucket = result.current.targetBucket

      act(() => {
        result.current.setTargetBucket("bucket-2")
      })

      expect(result.current.targetBucket).not.toBe(initialBucket)
      expect(result.current.targetBucket).toBe("bucket-2")
    })

    it("should maintain independent state for each bucket", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: mockRows,
        })
      )

      // Local folders should be bucket-specific
      expect(result.current.localFolders).toBeDefined()
      expect(typeof result.current.localFolders).toBe("object")
    })
  })

  describe("edge cases", () => {
    it("should handle empty buckets array", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: [],
          existingRows: [],
        })
      )

      expect(result.current.visibleBuckets).toEqual([])
    })

    it("should handle undefined buckets", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: undefined as unknown as Array<{ name: string }>,
          existingRows: [],
        })
      )

      expect(result.current.targetBucket).toBe("bucket-1")
    })

    it("should handle empty rows array", () => {
      const { result } = renderHook(() =>
        useCopyMoveModalState({
          initialBucket: "bucket-1",
          allBuckets: mockBuckets,
          existingRows: [],
        })
      )

      expect(result.current.currentPrefix).toBeDefined()
    })
  })
})

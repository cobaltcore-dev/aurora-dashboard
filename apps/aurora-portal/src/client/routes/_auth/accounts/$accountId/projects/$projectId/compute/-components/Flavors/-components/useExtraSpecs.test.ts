import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useExtraSpecs } from "./useExtraSpecs"
import { TrpcClient } from "@/client/trpcClient"

describe("useExtraSpecs", () => {
  const mockGetExtraSpecs = vi.fn()
  const mockCreateExtraSpecs = vi.fn()
  const mockDeleteExtraSpec = vi.fn()

  const mockClient = {
    compute: {
      getExtraSpecs: {
        query: mockGetExtraSpecs,
      },
      createExtraSpecs: {
        mutate: mockCreateExtraSpecs,
      },
      deleteExtraSpec: {
        mutate: mockDeleteExtraSpec,
      },
    },
  } as unknown as TrpcClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches extra specs successfully", async () => {
    const mockSpecs = { cpu: "dedicated", memory: "2GB" }
    mockGetExtraSpecs.mockResolvedValue(mockSpecs)

    const { result } = renderHook(() => useExtraSpecs(mockClient, "project-1", "flavor-1"))

    await act(async () => {
      await result.current.fetchExtraSpecs()
    })

    expect(result.current.extraSpecs).toEqual(mockSpecs)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("handles fetch error", async () => {
    mockGetExtraSpecs.mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(() => useExtraSpecs(mockClient, "project-1", "flavor-1"))

    await act(async () => {
      await result.current.fetchExtraSpecs()
    })

    expect(result.current.error).toBe("Network error")
    expect(result.current.isLoading).toBe(false)
  })

  it("adds extra spec successfully", async () => {
    mockCreateExtraSpecs.mockResolvedValue({})

    const { result } = renderHook(() => useExtraSpecs(mockClient, "project-1", "flavor-1"))

    await act(async () => {
      await result.current.addExtraSpec("newKey", "newValue")
    })

    expect(mockCreateExtraSpecs).toHaveBeenCalledWith({
      projectId: "project-1",
      flavorId: "flavor-1",
      extra_specs: { newKey: "newValue" },
    })
  })

  it("deletes extra spec successfully", async () => {
    mockDeleteExtraSpec.mockResolvedValue({})

    const { result } = renderHook(() => useExtraSpecs(mockClient, "project-1", "flavor-1"))

    result.current.extraSpecs = { cpu: "dedicated", memory: "2GB" }

    await act(async () => {
      await result.current.deleteExtraSpec("cpu")
    })

    expect(mockDeleteExtraSpec).toHaveBeenCalledWith({
      projectId: "project-1",
      flavorId: "flavor-1",
      key: "cpu",
    })
  })

  it("throws error when flavor ID is missing for add", async () => {
    const { result } = renderHook(() => useExtraSpecs(mockClient, "project-1", undefined))

    await expect(result.current.addExtraSpec("key", "value")).rejects.toThrow("Flavor ID is missing")
  })
})

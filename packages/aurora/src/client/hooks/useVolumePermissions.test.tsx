import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useVolumePermissions } from "./useVolumePermissions"

const h = vi.hoisted(() => ({
  available: true,
  pending: false,
  availabilityError: null as unknown,
  check: vi.fn(),
  availability: vi.fn(),
  refetchAvailability: vi.fn(),
  refetchPermissions: vi.fn(),
}))
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    volume: {
      getAvailability: {
        useQuery: (...args: unknown[]) => {
          h.availability(...args)
          return {
            data: { available: h.available },
            isPending: h.pending,
            error: h.availabilityError,
            refetch: h.refetchAvailability,
          }
        },
      },
      canUser: {
        useQuery: (...args: unknown[]) => {
          h.check(...args)
          return { data: [true, true, true, true], isPending: false, error: null, refetch: h.refetchPermissions }
        },
      },
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  h.available = true
  h.pending = false
  h.availabilityError = null
  h.refetchAvailability.mockResolvedValue({ data: { available: true } })
})

describe("useVolumePermissions", () => {
  it("gates nav/card capabilities on the server's v3 endpoint availability, not cached policy results", () => {
    h.available = false
    const { result } = renderHook(() => useVolumePermissions("project-1"))
    expect(result.current.canListVolumes).toBe(false)
    expect(result.current.canListSnapshots).toBe(false)
    expect(result.current.isPending).toBe(false)
    expect(h.check).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }))
  })
  it("scopes the availability query to the requested project", () => {
    renderHook(() => useVolumePermissions("project-2"))
    expect(h.availability).toHaveBeenCalledWith({ project_id: "project-2" }, expect.objectContaining({ enabled: true }))
  })
  it("keeps capabilities denied while availability is pending", () => {
    h.available = false
    h.pending = true
    const { result } = renderHook(() => useVolumePermissions("project-1"))
    expect(result.current.isPending).toBe(true)
    expect(result.current.canReadVolumes).toBe(false)
  })
  it("propagates availability failures instead of displaying stale permission grants", () => {
    h.availabilityError = new Error("unavailable")
    const { result } = renderHook(() => useVolumePermissions("project-1"))
    expect(result.current.error).toBe(h.availabilityError)
    expect(result.current.canListVolumes).toBe(false)
  })
  it("retries endpoint availability before permission checks", async () => {
    const { result } = renderHook(() => useVolumePermissions("project-1"))
    await act(async () => {
      await result.current.refetch()
    })
    expect(h.refetchAvailability).toHaveBeenCalledTimes(1)
    expect(h.refetchPermissions).toHaveBeenCalledTimes(1)
  })
})

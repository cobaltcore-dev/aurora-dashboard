import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useSharedFileSystemPermissions } from "./useSharedFileSystemPermissions"

const h = vi.hoisted(() => ({
  data: null as boolean[] | null,
  pending: false,
  error: null as unknown,
  check: vi.fn(),
  refetch: vi.fn(),
}))
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    sharedFileSystem: {
      canUser: {
        useQuery: (...args: unknown[]) => {
          h.check(...args)
          return { data: h.data, isPending: h.pending, error: h.error, refetch: h.refetch }
        },
      },
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  h.data = [true, true, true, true, true, true, true, true, true, true]
  h.pending = false
  h.error = null
})

describe("useSharedFileSystemPermissions", () => {
  it("calls the query with enabled false when enabled=false", () => {
    renderHook(() => useSharedFileSystemPermissions("project-1", false))
    expect(h.check).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: "project-1" }),
      expect.objectContaining({ enabled: false })
    )
  })

  it("returns all flags true when data is [true × 10]", () => {
    const { result } = renderHook(() => useSharedFileSystemPermissions("project-1"))
    expect(result.current.canListShares).toBe(true)
    expect(result.current.canReadShares).toBe(true)
    expect(result.current.canListExportLocations).toBe(true)
    expect(result.current.canListSnapshots).toBe(true)
    expect(result.current.canReadSnapshots).toBe(true)
    expect(result.current.canListReplicas).toBe(true)
    expect(result.current.canListShareNetworks).toBe(true)
    expect(result.current.canReadShareNetworks).toBe(true)
    expect(result.current.canListSecurityServices).toBe(true)
    expect(result.current.canReadSecurityServices).toBe(true)
    expect(result.current.canListAny).toBe(true)
  })

  it("returns canListShareNetworks and canListAny true when only index 6 is true", () => {
    h.data = [false, false, false, false, false, false, true, false, false, false]
    const { result } = renderHook(() => useSharedFileSystemPermissions("project-1"))
    expect(result.current.canListShareNetworks).toBe(true)
    expect(result.current.canListAny).toBe(true)
    expect(result.current.canListShares).toBe(false)
    expect(result.current.canListSecurityServices).toBe(false)
  })

  it("returns all flags false on error", () => {
    h.error = new Error("permission check failed")
    const { result } = renderHook(() => useSharedFileSystemPermissions("project-1"))
    expect(result.current.canListShares).toBe(false)
    expect(result.current.canListShareNetworks).toBe(false)
    expect(result.current.canListSecurityServices).toBe(false)
    expect(result.current.canListAny).toBe(false)
  })

  it("passes project_id and all 10 permission keys to the query", () => {
    renderHook(() => useSharedFileSystemPermissions("project-2"))
    expect(h.check).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "project-2",
        permission: [
          "shared-file-system:shares:list",
          "shared-file-system:shares:read",
          "shared-file-system:export_locations:list",
          "shared-file-system:snapshots:list",
          "shared-file-system:snapshots:read",
          "shared-file-system:replicas:list",
          "shared-file-system:share_networks:list",
          "shared-file-system:share_networks:read",
          "shared-file-system:security_services:list",
          "shared-file-system:security_services:read",
        ],
      }),
      expect.anything()
    )
  })

  it("returns isPending false when enabled=false", () => {
    h.pending = true
    const { result } = renderHook(() => useSharedFileSystemPermissions("project-1", false))
    expect(result.current.isPending).toBe(false)
  })
})

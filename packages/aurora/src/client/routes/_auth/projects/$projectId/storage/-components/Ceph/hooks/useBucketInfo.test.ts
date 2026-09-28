import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useBucketInfo } from "./useBucketInfo"

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

const { mockContainersListUseQuery, mockObjectsListUseQuery, mockGetStateUseQuery, mockGetStatusUseQuery } = vi.hoisted(
  () => ({
    mockContainersListUseQuery: vi.fn(),
    mockObjectsListUseQuery: vi.fn(),
    mockGetStateUseQuery: vi.fn(),
    mockGetStatusUseQuery: vi.fn(),
  })
)

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        versioning: {
          // Regression guard for the removed second GetBucketVersioning round-trip: `getState`
          // already reads the status server-side, so this must never be queried from here.
          getStatus: { useQuery: mockGetStatusUseQuery },
        },
        bucketPolicy: {
          get: { useQuery: vi.fn(() => ({ data: { policy: null }, isLoading: false, error: null })) },
        },
        cors: {
          get: { useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })) },
        },
        lifecycle: {
          get: { useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })) },
        },
        containers: {
          // Regression guards for the removed `containers.list` probe (bucketObjectCount used
          // to always read 0 from here without `includeMetadata`) — kept as spies so a future
          // regression that re-adds this call fails loudly instead of silently.
          list: { useQuery: mockContainersListUseQuery },
          getState: { useQuery: mockGetStateUseQuery },
        },
        objects: {
          // Regression guard for the removed truncation-prone `objects.list` probe.
          list: { useQuery: mockObjectsListUseQuery },
        },
      },
    },
  },
}))

describe("useBucketInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStateUseQuery.mockReturnValue({
      data: {
        status: "Enabled",
        isVersioningEnabled: true,
        isEmpty: false,
        hasOnlyDeleteMarkers: false,
        hasOldVersionsOrDeleteMarkers: true,
        isPartialScan: false,
      },
      isLoading: false,
      error: null,
    })
    mockGetStatusUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null })
  })

  it("passes the version flag through from getState", () => {
    const { result } = renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))

    expect(result.current.hasOldVersionsOrDeleteMarkers).toBe(true)
  })

  it("fails closed on the version flag while getState hasn't resolved yet", () => {
    // The flag drives whether "Delete Versions" - which permanently and unrestorably removes
    // every non-current version - is offered at all, so an unknown must read as "don't offer".
    mockGetStateUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))

    expect(result.current.hasOldVersionsOrDeleteMarkers).toBe(false)
    expect(result.current.isLoading).toBe(true)
  })

  it("never calls containers.list or objects.list (both replaced by containers.getState)", () => {
    renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))

    expect(mockContainersListUseQuery).not.toHaveBeenCalled()
    expect(mockObjectsListUseQuery).not.toHaveBeenCalled()
    expect(mockGetStateUseQuery).toHaveBeenCalled()
  })

  it("takes the versioning status from getState instead of a second GetBucketVersioning", () => {
    mockGetStateUseQuery.mockReturnValue({
      data: {
        status: "Suspended",
        isVersioningEnabled: true,
        isEmpty: false,
        hasOnlyDeleteMarkers: false,
        hasOldVersionsOrDeleteMarkers: false,
        isPartialScan: false,
      },
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))

    // "Suspended" rather than "Enabled" on purpose: it is the value that forced this hook to
    // keep a separate `versioning.getStatus` query, since `isVersioningEnabled` collapses the
    // two into one boolean and the bucket header renders a different badge for each.
    expect(result.current.versioningStatus).toEqual({ status: "Suspended" })
    expect(mockGetStatusUseQuery).not.toHaveBeenCalled()
  })

  it("reports no versioning status at all while getState is still loading", () => {
    mockGetStateUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))

    // Not a guessed "Unversioned": the header hides both badges on undefined, which is the
    // honest render for "not known yet".
    expect(result.current.versioningStatus).toBeUndefined()
  })

  it("keeps the versioning status object stable across re-renders", () => {
    // It is handed to BucketHeaderActions as a prop; a fresh object every render would defeat
    // any memoization there for a value that hasn't changed.
    const { result, rerender } = renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))
    const first = result.current.versioningStatus

    rerender()

    expect(result.current.versioningStatus).toBe(first)
  })

  it("isLoading is true while getState is loading", () => {
    mockGetStateUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))

    expect(result.current.isLoading).toBe(true)
  })

  it("isLoading is false once every underlying query has settled", () => {
    const { result } = renderHook(() => useBucketInfo({ bucketName: "my-bucket" }))

    expect(result.current.isLoading).toBe(false)
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { invalidateCredentialQueries } from "./invalidateCredentialQueries"
import { trpcReact } from "@/client/trpcClient"

const projectId = "project-1"

const credentialsList = vi.fn()
const containersList = vi.fn()
const containersStatus = vi.fn()
const getData = vi.fn()

const utils = {
  storage: {
    ceph: {
      ec2Credentials: { list: { invalidate: credentialsList, getData } },
      containers: {
        list: { invalidate: containersList },
        status: { invalidate: containersStatus },
      },
    },
  },
} as unknown as ReturnType<typeof trpcReact.useUtils>

const withKeys = (count: number) => getData.mockReturnValue(Array.from({ length: count }, (_, i) => ({ id: `k${i}` })))

describe("invalidateCredentialQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("refreshes the key table on any mutation", async () => {
    withKeys(2)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    expect(credentialsList).toHaveBeenCalledTimes(1)
  })

  it("reads the count only after the key table has been refreshed", async () => {
    const order: string[] = []
    credentialsList.mockImplementation(async () => {
      order.push("invalidate")
    })
    getData.mockImplementation(() => {
      order.push("getData")
      return [{ id: "k0" }]
    })

    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // The whole point: deciding from the caller's copy is wrong during a rotate, when the second
    // mutation can settle before the first one's refetch lands.
    expect(order).toEqual(["invalidate", "getData"])
    credentialsList.mockReset()
    getData.mockReset()
  })

  it("refreshes the bucket listing when the created key is the project's first", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // 0 -> 1 is when `containers.list` stops throwing NO_CEPH_CREDENTIALS behind the modal.
    expect(containersList).toHaveBeenCalledTimes(1)
  })

  it("leaves the bucket listing alone for a second key", async () => {
    withKeys(2)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // The page reads this one with `includeMetadata: true` - a ListObjectsV2 per bucket. A second
    // key changes no bucket, no object and no size.
    expect(containersList).not.toHaveBeenCalled()
  })

  it("refreshes the bucket listing when the deleted key was the last", async () => {
    withKeys(0)
    await invalidateCredentialQueries(utils, { projectId, mutation: "delete" })

    expect(containersList).toHaveBeenCalledTimes(1)
  })

  it("leaves the bucket listing alone when a key remains after the delete", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "delete" })

    expect(containersList).not.toHaveBeenCalled()
  })

  it("refreshes the bucket listing when the refreshed count is unknown", async () => {
    getData.mockReturnValue(undefined)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // A refetch that failed with nothing cached before it: a needless refresh costs time, a
    // missed one strands the page on "Setup Required" until a manual reload.
    expect(containersList).toHaveBeenCalledTimes(1)
  })

  it("never refreshes containers.status", async () => {
    withKeys(1)
    await invalidateCredentialQueries(utils, { projectId, mutation: "create" })

    // Its only reader takes endpoint/region from it, holds them at `staleTime: Infinity`, and
    // never reads `hasCredentials`. Invalidating refetches regardless of staleTime, and the
    // refetch costs a Keystone credentials lookup in `cephProcedure`'s middleware.
    expect(containersStatus).not.toHaveBeenCalled()
  })
})

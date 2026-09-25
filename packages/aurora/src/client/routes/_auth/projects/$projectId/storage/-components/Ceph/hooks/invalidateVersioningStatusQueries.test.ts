import { describe, it, expect, vi, beforeEach } from "vitest"
import { invalidateVersioningStatusQueries } from "./invalidateVersioningStatusQueries"
import { trpcReact } from "@/client/trpcClient"

const getStatus = vi.fn()
const containersGetState = vi.fn()
const objectsList = vi.fn()
const containersList = vi.fn()
const checkDeletedContent = vi.fn()

const utils = {
  storage: {
    ceph: {
      objects: { list: { invalidate: objectsList } },
      containers: {
        list: { invalidate: containersList },
        getState: { invalidate: containersGetState },
      },
      versioning: {
        getStatus: { invalidate: getStatus },
        checkDeletedContent: { invalidate: checkDeletedContent },
      },
    },
  },
} as unknown as ReturnType<typeof trpcReact.useUtils>

describe("invalidateVersioningStatusQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("refreshes both queries a bucket's versioning status is read from", async () => {
    await invalidateVersioningStatusQueries(utils)

    expect(getStatus).toHaveBeenCalledTimes(1)
    // The one the two modals forgot when `useBucketInfo` stopped reading `getStatus`: the
    // bucket header's badge and its Enable/Suspend menu both come from here.
    expect(containersGetState).toHaveBeenCalledTimes(1)
  })

  it("leaves the contents-scoped queries alone", async () => {
    await invalidateVersioningStatusQueries(utils)

    // `versioning.setStatus` flips one flag; it creates no object, version or delete marker.
    // Routing it through `invalidateBucketQueries` would add the `checkDeletedContent` scan and
    // two listings on top of the `getState` scan the helper runs anyway, to refresh one string.
    expect(objectsList).not.toHaveBeenCalled()
    expect(containersList).not.toHaveBeenCalled()
    expect(checkDeletedContent).not.toHaveBeenCalled()
  })

  it("resolves only once every invalidation has settled, so callers can await it", async () => {
    let settled = false
    containersGetState.mockImplementation(async () => {
      await Promise.resolve()
      settled = true
    })

    await invalidateVersioningStatusQueries(utils)

    expect(settled).toBe(true)
  })
})

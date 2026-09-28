import { describe, it, expect, vi, beforeEach } from "vitest"
import { invalidateBucketQueries } from "./invalidateBucketQueries"
import { trpcReact } from "@/client/trpcClient"

const objectsList = vi.fn()
const containersList = vi.fn()
const containersGetState = vi.fn()
const checkDeletedContent = vi.fn()
const listObjectVersions = vi.fn()

const utils = {
  storage: {
    ceph: {
      objects: { list: { invalidate: objectsList } },
      containers: {
        list: { invalidate: containersList },
        getState: { invalidate: containersGetState },
      },
      versioning: {
        checkDeletedContent: { invalidate: checkDeletedContent },
        listObjectVersions: { invalidate: listObjectVersions },
      },
    },
  },
} as unknown as ReturnType<typeof trpcReact.useUtils>

describe("invalidateBucketQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("always refreshes every query that depends on bucket contents", async () => {
    await invalidateBucketQueries(utils)

    expect(objectsList).toHaveBeenCalledTimes(1)
    expect(containersList).toHaveBeenCalledTimes(1)
    // The one that was forgotten when bucket state moved server-side, which is the
    // whole reason this helper exists.
    expect(containersGetState).toHaveBeenCalledTimes(1)
  })

  it("refreshes the deleted-content indicators with no opt-in, because callers got that choice wrong", async () => {
    await invalidateBucketQueries(utils)

    // This was an opt-in flag, and four of thirteen call sites answered it wrongly - including
    // two modals running the same mutation with two different answers. Writing to a key whose
    // current record is a delete marker clears deleted content just as a delete creates it, so
    // uploads and copies move this query too, not only deletes.
    expect(checkDeletedContent).toHaveBeenCalledTimes(1)
  })

  it("leaves the single-object version list alone unless asked", async () => {
    await invalidateBucketQueries(utils)

    // Unlike the bucket-wide queries above, this one is keyed to a single object: only the
    // modals acting on one version have anything to tell it.
    expect(listObjectVersions).not.toHaveBeenCalled()
  })

  it("refreshes the object version list when asked", async () => {
    await invalidateBucketQueries(utils, { objectVersions: true })

    expect(listObjectVersions).toHaveBeenCalledTimes(1)
  })

  it("resolves only once every invalidation has settled, so callers can await it", async () => {
    let settled = false
    containersGetState.mockImplementation(async () => {
      await Promise.resolve()
      settled = true
    })

    await invalidateBucketQueries(utils)

    expect(settled).toBe(true)
  })
})

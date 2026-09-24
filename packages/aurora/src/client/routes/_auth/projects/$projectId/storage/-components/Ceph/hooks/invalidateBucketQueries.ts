import { trpcReact } from "@/client/trpcClient"

type CephUtils = ReturnType<typeof trpcReact.useUtils>

interface InvalidateBucketQueriesOptions {
  /**
   * Also refresh the version list of a single object (`versioning.listObjectVersions`).
   *
   * Genuinely narrow, unlike the bucket-wide queries below: it is keyed to one object and only
   * the two modals that act on a single version have anything to tell it.
   */
  objectVersions?: boolean
}

/**
 * Refresh everything that depends on a bucket's contents after a mutation changed them.
 *
 * Exists because this set was copy-pasted across a dozen modals, and adding a query to it
 * meant remembering all of them: when bucket state moved server-side into
 * `containers.getState`, every one of those call sites kept invalidating `objects.list` and
 * silently went on showing pre-mutation state in the bucket menu for the length of its
 * staleTime. One place to add the next query.
 *
 * Every bucket-wide query is invalidated unconditionally, with no per-call-site opt-in: the one
 * flag that existed was answered inconsistently at four of thirteen sites on its first day, and
 * two of those were the same mutation called from two modals. A caller here knows which mutation
 * it ran, not which of several bucket-scoped server scans that mutation can move — so the helper
 * decides, once, and the reasoning lives next to each query below.
 *
 * Returns the combined promise so callers that need to await the refetch before navigating
 * or reporting can; the rest may ignore it, as the tRPC invalidate calls it wraps already
 * were.
 */
export function invalidateBucketQueries(utils: CephUtils, options: InvalidateBucketQueriesOptions = {}) {
  const invalidations = [
    utils.storage.ceph.objects.list.invalidate(),
    // Carries the per-bucket count/bytes/last_modified shown on the buckets page.
    utils.storage.ceph.containers.list.invalidate(),
    // Drives "Empty Bucket"/"Delete Versions" visibility and the delete-bucket blocking reasons.
    //
    // Not behind an opt-in flag, even though it is a server-side scan. On a versioned bucket
    // almost every mutation here changes it, including
    // the ones that look read-ish: `updateMetadata` and `copyObject` are CopyObjectCommands, and
    // copying onto an existing key writes a new version, which turns the previous current version
    // into an old one - flipping `hasOldVersionsOrDeleteMarkers` from false to true. Skipping the
    // invalidation for those would leave "Delete Versions" hidden on a bucket that now has
    // versions to delete: the same staleness this helper exists to prevent.
    utils.storage.ceph.containers.getState.invalidate(),
    // Drives the per-folder deleted-content indicators and the "Deleted" tab.
    //
    // Also unconditional, and for the same reason as `getState` above, which was not obvious:
    // this was an opt-in flag at first, on the theory that only deletes can change whether a
    // folder holds deleted content. They are not the only ones. The flags this query reports
    // key off delete markers that are *currently latest*, and writing to a key whose current
    // record is a delete marker makes that marker non-latest - so an upload, a copy or a folder
    // creation onto a deleted key removes deleted content just as surely as a delete adds it.
    // Of the thirteen call sites only `updateMetadata` was genuinely unable to move it, because
    // it can only run against a key that is currently visible.
    //
    // The scan it costs is also the cheaper of the two here: it is scoped to one prefix, where
    // `getState` scans the whole bucket. Making the cheaper, narrower query the opt-in one had
    // it backwards.
    utils.storage.ceph.versioning.checkDeletedContent.invalidate(),
  ]

  if (options.objectVersions) {
    invalidations.push(utils.storage.ceph.versioning.listObjectVersions.invalidate())
  }

  return Promise.all(invalidations)
}

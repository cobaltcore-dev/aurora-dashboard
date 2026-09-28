import { trpcReact } from "@/client/trpcClient"

type CephUtils = ReturnType<typeof trpcReact.useUtils>

/**
 * Refresh every query that reports a bucket's versioning status after `versioning.setStatus`
 * changed it.
 *
 * Deliberately not `invalidateBucketQueries`: that helper refreshes what depends on a bucket's
 * *contents*, and flipping the versioning flag changes no object, no version and no delete
 * marker. Routing through it would additionally order the `versioning.checkDeletedContent` scan
 * and two listings, on top of the `containers.getState` scan this helper runs anyway — to
 * refresh one string. Composing the two the other way round is worse still: that helper
 * deliberately leaves `versioning.getStatus` alone, and `ObjectBrowserView` keeps it mounted for
 * the whole session, so every upload, copy and delete would start refetching it.
 *
 * Separate helper rather than two literal `invalidate()` calls in each modal, because two call
 * sites spelling out the same set is exactly how this broke: the status used to come from
 * `versioning.getStatus` alone, `useBucketInfo` moved to `containers.getState` (which issues
 * `GetBucketVersioning` anyway, so the separate query was a duplicate round-trip), and both
 * modals kept invalidating only the query nothing read any more. The bucket header then showed
 * the pre-mutation badge — not for `staleTime`, but until another mutation invalidated the query,
 * the view remounted or the network reconnected: a mounted observer does not refetch when its
 * data goes stale, and `refetchOnWindowFocus` is off globally (`App.tsx`).
 *
 * So both readers are listed here, once. The next one that appears gets added here too — and to
 * `invalidateBucketQueries` as well, if it reports bucket contents alongside the status, since
 * `containers.getState` is deliberately named by both lists.
 *
 * Returns the combined promise for callers that need to await the refetch; the rest may ignore
 * it, as the tRPC invalidate calls it wraps already were.
 */
export function invalidateVersioningStatusQueries(utils: CephUtils) {
  return Promise.all([
    // Read by `ObjectBrowserView`: it gates the Deleted tab, the deleted-content scan, and the
    // `versioningEnabled` props it passes down to the object list and its modals.
    utils.storage.ceph.versioning.getStatus.invalidate(),
    // Read by `useBucketInfo` -> `BucketHeader`: the "Versioning Enabled"/"Versioning Suspended"
    // badge, and the menu that decides whether to offer Enable or Suspend.
    //
    // `EmptyBucketModal` and `DeleteBucketModal` read this query directly too, and deliberately
    // need nothing from here: both run at `staleTime: 0` and mount only while open, so each open
    // re-verifies live rather than trusting whatever the cache holds.
    utils.storage.ceph.containers.getState.invalidate(),
  ])
}

import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans, Plural } from "@lingui/react/macro"
import type { DeleteObjectError } from "@/server/Storage/types/ceph"
import { formatBulkDeleteErrors } from "../Objects/utils/bulkDeleteErrors"

type ToastReturnType = { message: ReactNode } & NotificationOptions

export const getBucketCreatedToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>Bucket Created</Trans>,
  description: <Trans>Bucket "{bucketName}" was successfully created.</Trans>,
})

export const getBucketCreateErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Create Bucket</Trans>,
  description: (
    <Trans>
      Could not create bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getBucketEmptiedToast = (bucketName: string, deletedCount: number): ToastReturnType => ({
  message: <Trans>Bucket Emptied</Trans>,
  description:
    deletedCount === 0 ? (
      <Trans>Bucket "{bucketName}" was already empty.</Trans>
    ) : deletedCount === 1 ? (
      <Trans>
        Bucket "{bucketName}" was successfully emptied. {deletedCount} object deleted.
      </Trans>
    ) : (
      <Trans>
        Bucket "{bucketName}" was successfully emptied. {deletedCount} objects deleted.
      </Trans>
    ),
})

export const getBucketEmptyErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Empty Bucket</Trans>,
  description: (
    <Trans>
      Could not empty bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getBucketDeletedToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>Bucket Deleted</Trans>,
  description: <Trans>Bucket "{bucketName}" was successfully deleted.</Trans>,
})

export const getBucketDeleteErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Delete Bucket</Trans>,
  description: (
    <Trans>
      Could not delete bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getBucketsEmptyCompleteToast = (
  emptiedCount: number,
  totalDeleted: number,
  errors: string[]
): ToastReturnType => {
  const hasErrors = errors.length > 0
  const totalBuckets = emptiedCount + errors.length
  const errorsLength = errors.length

  return {
    message: hasErrors ? <Trans>Empty All Completed with Errors</Trans> : <Trans>All Buckets Emptied</Trans>,
    description: hasErrors ? (
      <Trans>
        Successfully emptied {emptiedCount} of {totalBuckets}{" "}
        <Plural value={totalBuckets} one="bucket" other="buckets" />, deleting {totalDeleted}{" "}
        <Plural value={totalDeleted} one="object" other="objects" />. {errorsLength}{" "}
        <Plural value={errorsLength} one="bucket" other="buckets" /> failed.
      </Trans>
    ) : (
      <Trans>
        Successfully emptied {emptiedCount} <Plural value={emptiedCount} one="bucket" other="buckets" />, deleting{" "}
        {totalDeleted} <Plural value={totalDeleted} one="object" other="objects" />.
      </Trans>
    ),
  }
}

// ── Versioning operations ──────────────────────────────────────────────────

export const getVersioningEnabledToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>Versioning Enabled</Trans>,
  description: <Trans>Versioning was successfully enabled for bucket "{bucketName}".</Trans>,
})

export const getVersioningEnableErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Enable Versioning</Trans>,
  description: (
    <Trans>
      Could not enable versioning for bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getVersioningSuspendedToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>Versioning Suspended</Trans>,
  description: <Trans>Versioning was successfully suspended for bucket "{bucketName}".</Trans>,
})

export const getVersioningSuspendErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Suspend Versioning</Trans>,
  description: (
    <Trans>
      Could not suspend versioning for bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

// ── Bucket policy operations ───────────────────────────────────────────────

export const getBucketPolicySavedToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>Bucket Policy Saved</Trans>,
  description: <Trans>Bucket policy was successfully saved for "{bucketName}".</Trans>,
})

export const getBucketPolicySaveErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Save Bucket Policy</Trans>,
  description: (
    <Trans>
      Could not save bucket policy for "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getBucketPolicyDeletedToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>Policy Deleted</Trans>,
  description: <Trans>Bucket policy was successfully deleted from "{bucketName}".</Trans>,
})

export const getBucketPolicyDeleteErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Delete Policy</Trans>,
  description: (
    <Trans>
      Could not delete bucket policy from "{bucketName}": {errorMessage}
    </Trans>
  ),
})

// ── Delete versions operation ──────────────────────────────────────────────

export const getVersionsDeletedToast = (bucketName: string, deletedCount: number): ToastReturnType => ({
  message: <Trans>Versions Deleted</Trans>,
  description:
    deletedCount === 0 ? (
      <Trans>No versions to delete in bucket "{bucketName}".</Trans>
    ) : deletedCount === 1 ? (
      <Trans>
        Successfully deleted {deletedCount} version from bucket "{bucketName}".
      </Trans>
    ) : (
      <Trans>
        Successfully deleted {deletedCount} versions from bucket "{bucketName}".
      </Trans>
    ),
})

export const getVersionsDeleteErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Delete Versions</Trans>,
  description: (
    <Trans>
      Could not delete versions from bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

/**
 * A run of `deleteNonCurrentVersions` that neither failed outright nor completed cleanly.
 *
 * `errorCount` and `incomplete` are independent, not alternatives: the server records a
 * per-key error *and* sets `isPartial` for every key it had to skip (NoCurrentVersion,
 * MissingVersionId, TooManyVersions), so the two co-occur in the most ordinary partial run.
 * Both have to reach the user - the error list tells them what to look at, `incomplete`
 * tells them the operation has to be run again.
 */
export interface PartialVersionDeleteOutcome {
  deletedCount: number
  errorCount: number
  /** Itemised failures; the server caps this at MAX_REPORTED_DELETE_ERRORS while errorCount stays exact. */
  errors: DeleteObjectError[]
  /** The scan stopped before the end of the bucket, so non-current versions may survive. */
  incomplete: boolean
}

/** Itemised failures spelled out in the toast before it collapses the rest into a count. */
const MAX_LISTED_DELETE_ERRORS = 3

export const getVersionsPartiallyDeletedToast = (
  bucketName: string,
  outcome: PartialVersionDeleteOutcome
): ToastReturnType => {
  const { deletedCount, errorCount, errors, incomplete } = outcome
  const listedErrors = errors.slice(0, MAX_LISTED_DELETE_ERRORS)
  const listed = formatBulkDeleteErrors(listedErrors)
  const unlisted = errorCount - listedErrors.length

  return {
    message: <Trans>Versions Partially Deleted</Trans>,
    description: (
      <>
        <Trans>
          Deleted {deletedCount} <Plural value={deletedCount} one="version" other="versions" /> from bucket "
          {bucketName}".
        </Trans>{" "}
        {errorCount > 0 &&
          (listedErrors.length > 0 ? (
            <>
              <Trans>
                {errorCount} <Plural value={errorCount} one="item" other="items" /> could not be deleted: {listed}
              </Trans>{" "}
            </>
          ) : (
            <>
              <Trans>
                {errorCount} <Plural value={errorCount} one="item" other="items" /> could not be deleted.
              </Trans>{" "}
            </>
          ))}
        {unlisted > 0 && (
          <>
            <Trans>
              {unlisted} further <Plural value={unlisted} one="failure is" other="failures are" /> not listed here.
            </Trans>{" "}
          </>
        )}
        {incomplete && (
          <Trans>
            The scan did not reach the end of the bucket, so non-current versions may remain. Run Delete Versions again.
          </Trans>
        )}
      </>
    ),
    // A stable id so re-running - which is exactly what this toast asks for - replaces the
    // previous report instead of stacking another one that never goes away.
    id: `versions-partial-${bucketName}`,
    // duration: Infinity — this toast asks the user to run the action again. The 4s default
    // is not enough to read it, let alone act on it. Dismissed by the user, not by a timer
    // (same reasoning as the object-download toast in Objects/stores/objectDownloadStore.ts).
    duration: Infinity,
  }
}

// ── CORS configuration operations ──────────────────────────────────────────

export const getCorsSavedToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>CORS Configuration Saved</Trans>,
  description: <Trans>CORS configuration was successfully saved for bucket "{bucketName}".</Trans>,
})

export const getCorsSaveErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Save CORS Configuration</Trans>,
  description: (
    <Trans>
      Could not save CORS configuration for bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getCorsRuleDeletedToast = (bucketName: string, ruleId?: string): ToastReturnType => ({
  message: <Trans>CORS Rule Deleted</Trans>,
  description: ruleId ? (
    <Trans>
      Rule "{ruleId}" was successfully deleted from bucket "{bucketName}".
    </Trans>
  ) : (
    <Trans>CORS rule was successfully deleted from bucket "{bucketName}".</Trans>
  ),
})

export const getCorsRuleDeleteErrorToast = (
  bucketName: string,
  errorMessage: string,
  ruleId?: string
): ToastReturnType => ({
  message: <Trans>Failed to Delete CORS Rule</Trans>,
  description: ruleId ? (
    <Trans>
      Could not delete rule "{ruleId}" from bucket "{bucketName}": {errorMessage}
    </Trans>
  ) : (
    <Trans>
      Could not delete CORS rule from bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getCorsRulesDeletedToast = (bucketName: string, count: number): ToastReturnType => ({
  message: <Plural value={count} one="CORS Rule Deleted" other="CORS Rules Deleted" />,
  description:
    count === 1 ? (
      <Trans>
        Successfully deleted {count} CORS rule from bucket "{bucketName}".
      </Trans>
    ) : (
      <Trans>
        Successfully deleted {count} CORS rules from bucket "{bucketName}".
      </Trans>
    ),
})

export const getCorsRulesDeleteErrorToast = (
  bucketName: string,
  count: number,
  errorMessage: string
): ToastReturnType => ({
  message: <Plural value={count} one="Failed to Delete CORS Rule" other="Failed to Delete CORS Rules" />,
  description:
    count === 1 ? (
      <Trans>
        Could not delete {count} CORS rule from bucket "{bucketName}": {errorMessage}
      </Trans>
    ) : (
      <Trans>
        Could not delete {count} CORS rules from bucket "{bucketName}": {errorMessage}
      </Trans>
    ),
})

// ── Per-rule Lifecycle operations ───────────────────────────────────────────

export const getLifecycleSavedToast = (bucketName: string): ToastReturnType => ({
  message: <Trans>Lifecycle Rule Saved</Trans>,
  description: <Trans>Lifecycle rule was successfully saved for bucket "{bucketName}".</Trans>,
})

export const getLifecycleSaveErrorToast = (bucketName: string, errorMessage: string): ToastReturnType => ({
  message: <Trans>Failed to Save Lifecycle Rule</Trans>,
  description: (
    <Trans>
      Could not save lifecycle rule for bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getLifecycleRuleDeletedToast = (bucketName: string, ruleId?: string): ToastReturnType => ({
  message: <Trans>Lifecycle Rule Deleted</Trans>,
  description: ruleId ? (
    <Trans>
      Rule "{ruleId}" was successfully deleted from bucket "{bucketName}".
    </Trans>
  ) : (
    <Trans>Lifecycle rule was successfully deleted from bucket "{bucketName}".</Trans>
  ),
})

export const getLifecycleRuleDeleteErrorToast = (
  bucketName: string,
  errorMessage: string,
  ruleId?: string
): ToastReturnType => ({
  message: <Trans>Failed to Delete Lifecycle Rule</Trans>,
  description: ruleId ? (
    <Trans>
      Could not delete rule "{ruleId}" from bucket "{bucketName}": {errorMessage}
    </Trans>
  ) : (
    <Trans>
      Could not delete lifecycle rule from bucket "{bucketName}": {errorMessage}
    </Trans>
  ),
})

export const getLifecycleRulesDeletedToast = (bucketName: string, count: number): ToastReturnType => ({
  message: <Plural value={count} one="Lifecycle Rule Deleted" other="Lifecycle Rules Deleted" />,
  description:
    count === 1 ? (
      <Trans>
        Successfully deleted {count} lifecycle rule from bucket "{bucketName}".
      </Trans>
    ) : (
      <Trans>
        Successfully deleted {count} lifecycle rules from bucket "{bucketName}".
      </Trans>
    ),
})

export const getLifecycleRulesDeleteErrorToast = (
  bucketName: string,
  count: number,
  errorMessage: string
): ToastReturnType => ({
  message: <Plural value={count} one="Failed to Delete Lifecycle Rule" other="Failed to Delete Lifecycle Rules" />,
  description:
    count === 1 ? (
      <Trans>
        Could not delete {count} lifecycle rule from bucket "{bucketName}": {errorMessage}
      </Trans>
    ) : (
      <Trans>
        Could not delete {count} lifecycle rules from bucket "{bucketName}": {errorMessage}
      </Trans>
    ),
})

import { useEffect } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"

const MAX_VISIBLE_RULES = 5

interface DeleteCorsRulesModalProps {
  isOpen: boolean
  bucketName: string
  ruleIndices: number[]
  rules: CorsRuleRead[]
  onClose: () => void
  onSuccess?: (bucketName: string, count: number) => void
  onError?: (bucketName: string, errorMessage: string, count: number) => void
}

/**
 * Modal for bulk deletion of CORS rules
 *
 * Loads current CORS configuration, removes selected rules, and calls:
 * - `storage.ceph.cors.set` if rules remain after deletion
 * - `storage.ceph.cors.delete` if all rules are deleted
 */
export const DeleteCorsRulesModal = ({
  isOpen,
  bucketName,
  ruleIndices,
  rules,
  onClose,
  onSuccess,
  onError,
}: DeleteCorsRulesModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.cors.rules.bulk_delete",
  })

  // Query to get current CORS configuration
  const {
    data: corsData,
    isLoading: isCorsLoading,
    error: corsError,
  } = trpcReact.storage.ceph.cors.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: isOpen && !!projectId,
      retry: false,
    }
  )

  // Set mutation (for partial deletion)
  const setMutation = trpcReact.storage.ceph.cors.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName, ruleIndices.length)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message, ruleIndices.length)
    },
  })

  // Delete mutation (for deleting all rules)
  const deleteMutation = trpcReact.storage.ceph.cors.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName, ruleIndices.length)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message, ruleIndices.length)
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setMutation.reset()
      deleteMutation.reset()
      resetTracking()
    }
  }, [isOpen, bucketName])

  const handleClose = () => {
    setMutation.reset()
    deleteMutation.reset()
    resetTracking()
    onClose()
  }

  const handleDelete = () => {
    markSubmitted()

    if (!corsData?.corsRules) {
      onError?.(bucketName, "No CORS rules found", ruleIndices.length)
      return
    }

    // Filter out the rules to delete
    const remainingRules = corsData.corsRules.filter((_, index) => !ruleIndices.includes(index))

    if (remainingRules.length === 0) {
      // Delete entire CORS configuration
      deleteMutation.mutate({
        project_id: projectId,
        bucketName,
      })
    } else {
      // Type assertion needed because CorsRuleRead has string[] for AllowedMethods
      // but the mutation expects the narrower type from the schema
      // Update with remaining rules
      setMutation.mutate({
        project_id: projectId,
        bucketName,
        corsConfiguration: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          CORSRules: remainingRules as any,
        },
      })
    }
  }

  if (!isOpen) return null

  const ruleCount = ruleIndices.length
  const isDeleting = setMutation.isPending || deleteMutation.isPending
  const rulesToDelete = rules.filter((_, index) => ruleIndices.includes(index))
  const visibleRules = rulesToDelete.slice(0, MAX_VISIBLE_RULES)
  const hiddenCount = rulesToDelete.length - visibleRules.length
  const confirmLabel = isDeleting ? t`Deleting...` : ruleCount === 1 ? t`Delete Rule` : t`Delete Rules`

  return (
    <Modal
      title={<Plural value={ruleCount} one="Delete CORS Rule" other="Delete CORS Rules" />}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={confirmLabel}
      confirmButtonVariant="primary-danger"
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isDeleting || isCorsLoading || !!corsError}
      disableCancelButton={isDeleting}
      disableCloseButton={isDeleting}
    >
      <Stack direction="vertical" gap="4">
        {isCorsLoading && (
          <div className="flex items-center justify-center py-4">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {corsError && (
          <Message variant="error" title={t`Failed to load CORS configuration`}>
            {corsError.message}
          </Message>
        )}

        {!isCorsLoading && !corsError && (
          <>
            <p className="text-theme-default">
              <Trans>
                Are you sure you want to delete <Plural value={ruleCount} one="# CORS rule" other="# CORS rules" /> from
                bucket <strong>{bucketName}</strong>?
              </Trans>
            </p>

            <div>
              <p className="text-theme-light mb-2 text-sm">
                <Trans>Rules to delete:</Trans>
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {visibleRules.map((rule, idx) => {
                  const displayName = rule.ID || `Rule #${ruleIndices[idx] + 1}`
                  return <li key={idx}>{displayName}</li>
                })}
                {hiddenCount > 0 && (
                  <li className="text-theme-light">
                    <Trans>... and {hiddenCount} more</Trans>
                  </li>
                )}
              </ul>
            </div>

            <p className="text-theme-default">
              <Trans>This action cannot be undone.</Trans>
            </p>
          </>
        )}

        {(setMutation.isError || deleteMutation.isError) && (
          <Message variant="error" title={t`Failed to delete CORS rules`}>
            {setMutation.error?.message || deleteMutation.error?.message}
          </Message>
        )}
      </Stack>
    </Modal>
  )
}

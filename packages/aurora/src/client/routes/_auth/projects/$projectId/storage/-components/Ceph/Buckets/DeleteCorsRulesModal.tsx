import { useEffect, useState } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
import { toCorsRule } from "./utils/corsUtils"

const MAX_VISIBLE_RULES = 5

interface DeleteCorsRulesModalProps {
  isOpen: boolean
  bucketName: string
  ruleIndices: number[]
  rules: CorsRuleRead[]
  onClose: () => void
  onSuccess?: (bucketName: string, count: number) => void
  onError?: (bucketName: string, errorMessage: string, count: number) => void
  onMutatingChange?: (isMutating: boolean) => void
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
  onMutatingChange,
}: DeleteCorsRulesModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [isVerifying, setIsVerifying] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.cors.rules.bulk_delete",
  })

  // Query to get current CORS configuration (for loading/error states only)
  // The freshness check in handleDelete refetches directly
  const { isLoading: isCorsLoading, error: corsError } = trpcReact.storage.ceph.cors.get.useQuery(
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
    onMutatingChange?.(setMutation.isPending || deleteMutation.isPending)
  }, [setMutation.isPending, deleteMutation.isPending, onMutatingChange])

  useEffect(() => {
    if (!isOpen) {
      setMutation.reset()
      deleteMutation.reset()
      setIsVerifying(false)
      resetTracking()
    }
  }, [isOpen, bucketName])

  const handleClose = () => {
    setMutation.reset()
    deleteMutation.reset()
    setIsVerifying(false)
    resetTracking()
    onClose()
  }

  const handleDelete = async () => {
    if (isVerifying) return

    markSubmitted()
    setIsVerifying(true)

    try {
      // Refetch to get fresh data
      const freshData = await utils.storage.ceph.cors.get.fetch({
        project_id: projectId,
        bucketName,
      })

      const freshRules = freshData?.corsRules ?? []

      if (freshRules.length === 0) {
        onError?.(bucketName, t`No CORS rules found`, ruleIndices.length)
        return
      }

      // Freshness check: verify each rule at its index matches what the user selected
      const mismatches: number[] = []
      for (const index of ruleIndices) {
        const cachedRule = rules[index]
        const freshRule = freshRules[index]

        if (!freshRule || JSON.stringify(freshRule) !== JSON.stringify(cachedRule)) {
          mismatches.push(index)
        }
      }

      if (mismatches.length > 0) {
        onError?.(bucketName, t`The CORS configuration has changed. Please refresh and try again.`, ruleIndices.length)
        return
      }

      // Proceed with deletion using fresh data
      const remainingRules = freshRules.filter((_, index) => !ruleIndices.includes(index))

      if (remainingRules.length === 0) {
        // Delete entire CORS configuration
        deleteMutation.mutate({
          project_id: projectId,
          bucketName,
        })
      } else {
        // Update with remaining rules
        setMutation.mutate({
          project_id: projectId,
          bucketName,
          corsConfiguration: {
            CORSRules: remainingRules.map(toCorsRule),
          },
        })
      }
    } catch {
      onError?.(bucketName, t`Failed to verify CORS configuration`, ruleIndices.length)
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isOpen) return null

  const ruleCount = ruleIndices.length
  const isDeleting = setMutation.isPending || deleteMutation.isPending
  const rulesToDeleteWithIndices = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ index }) => ruleIndices.includes(index))
  const visibleRules = rulesToDeleteWithIndices.slice(0, MAX_VISIBLE_RULES)
  const hiddenCount = rulesToDeleteWithIndices.length - visibleRules.length
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
      disableConfirmButton={isDeleting || isCorsLoading || !!corsError || isVerifying}
      disableCancelButton={isDeleting || isVerifying}
      disableCloseButton={isDeleting || isVerifying}
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
                {visibleRules.map(({ rule, index }) => {
                  const displayName = rule.ID || `Rule #${index + 1}`
                  return <li key={index}>{displayName}</li>
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

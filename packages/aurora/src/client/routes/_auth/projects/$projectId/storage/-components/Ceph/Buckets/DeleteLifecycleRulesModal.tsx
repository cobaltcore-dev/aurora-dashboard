import { useEffect, useState } from "react"
import { Modal, Message, Spinner } from "@cloudoperators/juno-ui-components"
import { Trans, Plural, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { validateLifecycleRules } from "./utils/lifecycleUtils"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"

interface DeleteLifecycleRulesModalProps {
  isOpen: boolean
  bucketName: string
  ruleIndices: number[]
  rules: LifecycleRuleRead[]
  onClose: () => void
  onSuccess?: (bucketName: string, count: number) => void
  onError?: (bucketName: string, errorMessage: string, count: number) => void
  onMutatingChange?: (isMutating: boolean) => void
}

const MAX_VISIBLE_RULES = 5

/**
 * Modal to confirm bulk deletion of lifecycle rules
 *
 * Refetches lifecycle configuration before deleting to avoid lost updates.
 * If deleting all rules, calls lifecycle.delete instead of lifecycle.set.
 */
export const DeleteLifecycleRulesModal = ({
  isOpen,
  bucketName,
  ruleIndices,
  rules,
  onClose,
  onSuccess,
  onError,
  onMutatingChange,
}: DeleteLifecycleRulesModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [isVerifying, setIsVerifying] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.lifecycle.rules.bulk_delete",
  })

  // Query current lifecycle configuration (for loading/error states only - fresh data fetched in handleConfirm)
  const { isLoading, error: queryError } = trpcReact.storage.ceph.lifecycle.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: isOpen && !!projectId,
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  )

  // Delete mutation (when removing all rules)
  const deleteMutation = trpcReact.storage.ceph.lifecycle.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(bucketName, ruleIndices.length)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message, ruleIndices.length)
    },
  })

  // Set mutation (when other rules remain)
  const setMutation = trpcReact.storage.ceph.lifecycle.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(bucketName, ruleIndices.length)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message, ruleIndices.length)
    },
  })

  const isMutating = deleteMutation.isPending || setMutation.isPending

  useEffect(() => {
    onMutatingChange?.(isMutating)
  }, [isMutating, onMutatingChange])

  useEffect(() => {
    if (!isOpen) {
      deleteMutation.reset()
      setMutation.reset()
      setIsVerifying(false)
      resetTracking()
    }
  }, [isOpen])

  const handleClose = () => {
    trackClose()
    deleteMutation.reset()
    setMutation.reset()
    setIsVerifying(false)
    resetTracking()
    onClose()
  }

  const handleConfirm = async () => {
    if (isVerifying) return

    markSubmitted()
    setIsVerifying(true)

    try {
      // Refetch to get fresh state
      const freshData = await utils.storage.ceph.lifecycle.get.fetch({
        project_id: projectId,
        bucketName,
      })

      const freshRules = freshData?.rules ?? []

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
        onError?.(
          bucketName,
          t`The lifecycle configuration has changed. Please refresh and try again.`,
          ruleIndices.length
        )
        return
      }

      // Remove the selected rules
      const remaining = freshRules.filter((_, i) => !ruleIndices.includes(i))

      if (remaining.length === 0) {
        // All rules deleted - delete entire configuration
        deleteMutation.mutate({
          project_id: projectId,
          bucketName,
        })
      } else {
        // Some rules remain - validate and set
        const validation = validateLifecycleRules(remaining)
        if (!validation.ok) {
          const errorMsg = validation.errors.join("; ")
          onError?.(bucketName, t`Cannot delete rules: ${errorMsg}`, ruleIndices.length)
          return
        }

        setMutation.mutate({
          project_id: projectId,
          bucketName,
          lifecycleConfiguration: {
            Rules: validation.rules,
          },
        })
      }
    } catch (error) {
      onError?.(bucketName, error instanceof Error ? error.message : String(error), ruleIndices.length)
    } finally {
      setIsVerifying(false)
    }
  }

  const ruleCount = ruleIndices.length
  const rulesToDeleteWithIndices = ruleIndices
    .map((i) => ({ rule: rules[i], index: i }))
    .filter(({ rule }) => rule !== undefined)
  const visibleRules = rulesToDeleteWithIndices.slice(0, MAX_VISIBLE_RULES)
  const hiddenCount = rulesToDeleteWithIndices.length - visibleRules.length

  const confirmLabel = isMutating
    ? t`Deleting...`
    : ruleCount === 1
      ? t`Delete Lifecycle Rule`
      : t`Delete Lifecycle Rules`

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={<Plural value={ruleCount} one="Delete Lifecycle Rule" other="Delete Lifecycle Rules" />}
      size="small"
      confirmButtonLabel={confirmLabel}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isMutating || isVerifying || isLoading || !!queryError}
      disableCancelButton={isMutating || isVerifying}
      disableCloseButton={isMutating || isVerifying}
      closeOnEsc={!(isMutating || isVerifying)}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner variant="primary" />
        </div>
      ) : queryError ? (
        <Message variant="error" title={t`Failed to load lifecycle configuration`}>
          {queryError.message}
        </Message>
      ) : (
        <>
          <p>
            {ruleCount === 1 ? (
              <Trans>
                Are you sure you want to delete this lifecycle rule from bucket <strong>{bucketName}</strong>?
              </Trans>
            ) : (
              <Trans>
                Are you sure you want to delete {ruleCount} lifecycle rules from bucket <strong>{bucketName}</strong>?
              </Trans>
            )}
          </p>
          {rulesToDeleteWithIndices.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {visibleRules.map(({ rule, index }) => {
                const ruleNumber = index + 1
                return <li key={index}>{rule.ID || t`Rule #${ruleNumber}`}</li>
              })}
              {hiddenCount > 0 && (
                <li className="text-theme-light">
                  <Trans>... and {hiddenCount} more</Trans>
                </li>
              )}
            </ul>
          )}
          <p className="mt-2">
            <Trans>This action cannot be undone.</Trans>
          </p>
        </>
      )}
    </Modal>
  )
}

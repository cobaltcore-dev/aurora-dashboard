import { useEffect } from "react"
import { Modal, ModalFooter, ButtonRow, Button, Message, Spinner } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { validateLifecycleRules } from "./utils/lifecycleUtils"

interface DeleteLifecycleRuleModalProps {
  isOpen: boolean
  bucketName: string
  ruleIndex: number
  ruleId?: string
  onClose: () => void
  onSuccess?: (ruleIndex: number) => void
  onError?: (ruleIndex: number, errorMessage: string) => void
  onMutatingChange?: (isMutating: boolean) => void
}

/**
 * Modal to confirm deletion of a single lifecycle rule
 *
 * Refetches lifecycle configuration before deleting to avoid lost updates.
 * If deleting the last rule, calls lifecycle.delete instead of lifecycle.set.
 */
export const DeleteLifecycleRuleModal = ({
  isOpen,
  bucketName,
  ruleIndex,
  ruleId,
  onClose,
  onSuccess,
  onError,
  onMutatingChange,
}: DeleteLifecycleRuleModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.lifecycle.rule.delete",
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

  // Delete mutation (when removing last rule)
  const deleteMutation = trpcReact.storage.ceph.lifecycle.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(ruleIndex)
      handleClose()
    },
    onError: (error) => {
      onError?.(ruleIndex, error.message)
    },
  })

  // Set mutation (when other rules remain)
  const setMutation = trpcReact.storage.ceph.lifecycle.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(ruleIndex)
      handleClose()
    },
    onError: (error) => {
      onError?.(ruleIndex, error.message)
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
      resetTracking()
    }
  }, [isOpen])

  const handleClose = () => {
    trackClose()
    deleteMutation.reset()
    setMutation.reset()
    resetTracking()
    onClose()
  }

  const handleConfirm = async () => {
    markSubmitted()

    try {
      // Refetch to get fresh state
      const freshData = await utils.storage.ceph.lifecycle.get.fetch({
        project_id: projectId,
        bucketName,
      })

      const freshRules = freshData?.rules ?? []

      // Freshness check: ensure the rule we're deleting still exists at that index
      if (ruleIndex >= freshRules.length) {
        onError?.(ruleIndex, t`The lifecycle configuration has changed. Please refresh and try again.`)
        return
      }

      // Remove the rule
      const remaining = freshRules.filter((_, i) => i !== ruleIndex)

      if (remaining.length === 0) {
        // Last rule - delete entire configuration
        deleteMutation.mutate({
          project_id: projectId,
          bucketName,
        })
      } else {
        // Other rules remain - validate and set
        const validation = validateLifecycleRules(remaining)
        if (!validation.ok) {
          onError?.(ruleIndex, t`Cannot delete rule: ${validation.errors.join("; ")}`)
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
      onError?.(ruleIndex, error instanceof Error ? error.message : String(error))
    }
  }

  const displayName = ruleId || t`Rule #${ruleIndex + 1}`

  return (
    <Modal open={isOpen} onCancel={handleClose} title={t`Delete Lifecycle Rule`} size="small">
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
            <Trans>
              Are you sure you want to delete lifecycle rule <strong>{displayName}</strong> from bucket{" "}
              <strong>{bucketName}</strong>?
            </Trans>
          </p>
          <p className="mt-2">
            <Trans>This action cannot be undone.</Trans>
          </p>
          <ModalFooter>
            <ButtonRow>
              <Button variant="subdued" onClick={handleClose} disabled={isMutating}>
                <Trans>Cancel</Trans>
              </Button>
              <Button variant="primary-danger" onClick={handleConfirm} disabled={isMutating}>
                {isMutating ? <Trans>Deleting...</Trans> : <Trans>Delete Lifecycle Rule</Trans>}
              </Button>
            </ButtonRow>
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}

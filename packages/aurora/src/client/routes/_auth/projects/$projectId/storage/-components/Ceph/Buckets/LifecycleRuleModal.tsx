import { useEffect, useState } from "react"
import { Modal, Spinner, Message, ModalFooter, ButtonRow, Button } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { Trans } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { LifecycleRuleForm } from "./LifecycleRuleForm"
import type { LifecycleRuleRead } from "@/server/Storage/types/ceph"
import { validateLifecycleRules } from "./utils/lifecycleUtils"

interface LifecycleRuleModalProps {
  isOpen: boolean
  bucketName: string
  editingIndex: number | null // null = adding, non-null = editing
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
  onMutatingChange?: (isMutating: boolean) => void
}

/**
 * Modal wrapper for LifecycleRuleForm
 *
 * Handles adding or editing a single lifecycle rule.
 * Loads current lifecycle configuration, adds/updates the rule, and calls lifecycle.set.
 */
export const LifecycleRuleModal = ({
  isOpen,
  bucketName,
  editingIndex,
  onClose,
  onSuccess,
  onError,
  onMutatingChange,
}: LifecycleRuleModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [isFormValid, setIsFormValid] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.lifecycle",
  })

  // Query to get current lifecycle configuration
  const {
    data: lifecycleData,
    isLoading: isLifecycleLoading,
    error: lifecycleError,
  } = trpcReact.storage.ceph.lifecycle.get.useQuery(
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

  // Set mutation
  const setMutation = trpcReact.storage.ceph.lifecycle.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  useEffect(() => {
    onMutatingChange?.(setMutation.isPending)
  }, [setMutation.isPending, onMutatingChange])

  useEffect(() => {
    if (!isOpen) {
      setMutation.reset()
      setIsFormValid(false)
      setValidationErrors([])
      resetTracking()
    }
  }, [isOpen, bucketName])

  const handleClose = () => {
    trackClose()
    setMutation.reset()
    setIsFormValid(false)
    setValidationErrors([])
    resetTracking()
    onClose()
  }

  const handleSubmit = async (rule: LifecycleRuleRead) => {
    markSubmitted()
    setValidationErrors([])

    try {
      const currentRules = lifecycleData?.rules ?? []
      let updatedRules: LifecycleRuleRead[]

      if (editingIndex === null) {
        // Adding new rule - no freshness check needed (appending is safe)
        updatedRules = [...currentRules, rule]
      } else {
        // Editing existing rule - perform freshness check
        const freshData = await utils.storage.ceph.lifecycle.get.fetch({
          project_id: projectId,
          bucketName,
        })

        const freshRules = freshData?.rules ?? []
        const editingRule = lifecycleData?.rules?.[editingIndex]
        const freshRule = freshRules[editingIndex]

        // Freshness check
        if (!freshRule || JSON.stringify(freshRule) !== JSON.stringify(editingRule)) {
          onError?.(bucketName, t`The lifecycle configuration has changed. Please refresh and try again.`)
          return
        }

        updatedRules = [...freshRules]
        updatedRules[editingIndex] = rule
      }

      // Validate the updated rules before mutating
      const validation = validateLifecycleRules(updatedRules)
      if (!validation.ok) {
        setValidationErrors(validation.errors)
        return
      }

      // Mutation with validated rules
      setMutation.mutate({
        project_id: projectId,
        bucketName,
        lifecycleConfiguration: {
          Rules: validation.rules,
        },
      })
    } catch (error) {
      onError?.(bucketName, error instanceof Error ? error.message : String(error))
    }
  }

  const editingRule = editingIndex !== null ? (lifecycleData?.rules?.[editingIndex] ?? null) : null

  const isSaving = setMutation.isPending

  return (
    <Modal
      key={editingIndex ?? "new"}
      open={isOpen}
      onCancel={handleClose}
      title={editingRule ? t`Edit Lifecycle Rule` : t`Create Lifecycle Rule`}
      size="large"
      modalFooter={
        <ModalFooter className="bg-theme-background-lvl-0 sticky bottom-0 z-50 flex justify-end">
          <ButtonRow>
            <Button variant="subdued" onClick={handleClose} disabled={isSaving}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                document.querySelector<HTMLFormElement>("#lifecycle-rule-form")?.requestSubmit()
              }}
              disabled={!isFormValid || isSaving || isLifecycleLoading || !!lifecycleError}
            >
              {isSaving ? (
                editingRule ? (
                  <Trans>Saving...</Trans>
                ) : (
                  <Trans>Creating...</Trans>
                )
              ) : editingRule ? (
                <Trans>Save Changes</Trans>
              ) : (
                <Trans>Create Lifecycle Rule</Trans>
              )}
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      {isLifecycleLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner variant="primary" size="large" />
        </div>
      ) : lifecycleError ? (
        <Message variant="error" title={t`Failed to load lifecycle configuration`}>
          {lifecycleError.message}
        </Message>
      ) : (
        <>
          {validationErrors.length > 0 && (
            <Message variant="error" title={t`Validation Error`} className="mb-4">
              <ul className="list-disc pl-5">
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </Message>
          )}
          <LifecycleRuleForm
            formId="lifecycle-rule-form"
            editingRule={editingRule}
            onSubmit={handleSubmit}
            onValidationChange={setIsFormValid}
          />
        </>
      )}
    </Modal>
  )
}

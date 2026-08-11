import { useEffect, useState } from "react"
import { Modal, Spinner, Message, ModalFooter, ButtonRow, Button } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { Trans } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { CorsRuleForm } from "./CorsRuleForm"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
import { toCorsRule } from "./utils/corsUtils"

interface CorsRuleModalProps {
  isOpen: boolean
  bucketName: string
  editingIndex: number | null // null = adding, non-null = editing
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

/**
 * Modal wrapper for CorsRuleForm
 *
 * Handles adding or editing a single CORS rule.
 * Loads current CORS configuration, adds/updates the rule, and calls cors.set.
 */
export const CorsRuleModal = ({
  isOpen,
  bucketName,
  editingIndex,
  onClose,
  onSuccess,
  onError,
}: CorsRuleModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [isFormValid, setIsFormValid] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.cors",
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
      staleTime: 5 * 60 * 1000,
    }
  )

  // Set mutation
  const setMutation = trpcReact.storage.ceph.cors.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setMutation.reset()
      setIsFormValid(false)
      resetTracking()
    }
  }, [isOpen, bucketName])

  const handleClose = () => {
    setMutation.reset()
    setIsFormValid(false)
    resetTracking()
    onClose()
  }

  const handleSubmit = async (rule: CorsRuleRead) => {
    markSubmitted()

    try {
      const currentRules = corsData?.corsRules ?? []
      let updatedRules: CorsRuleRead[]

      if (editingIndex === null) {
        // Adding new rule - no freshness check needed (appending is safe)
        updatedRules = [...currentRules, rule]
      } else {
        // Editing existing rule - perform freshness check
        const freshData = await utils.storage.ceph.cors.get.fetch({
          project_id: projectId,
          bucketName,
        })

        const freshRules = freshData?.corsRules ?? []
        const editingRule = corsData?.corsRules?.[editingIndex]
        const freshRule = freshRules[editingIndex]

        // Freshness check
        if (!freshRule || JSON.stringify(freshRule) !== JSON.stringify(editingRule)) {
          onError?.(bucketName, t`The CORS configuration has changed. Please refresh and try again.`)
          return
        }

        // Proceed with edit using fresh data
        updatedRules = [...freshRules]
        updatedRules[editingIndex] = rule
      }

      // Type assertion needed because CorsRuleRead has string[] for AllowedMethods
      // but the mutation expects the narrower type from the schema
      setMutation.mutate({
        project_id: projectId,
        bucketName,
        corsConfiguration: {
          CORSRules: updatedRules.map(toCorsRule),
        },
      })
    } catch {
      onError?.(bucketName, t`Failed to verify CORS configuration`)
    }
  }

  if (!isOpen) return null

  const editingRule =
    editingIndex !== null && corsData?.corsRules?.[editingIndex] ? corsData.corsRules[editingIndex] : null
  const isSaving = setMutation.isPending
  const formId = "cors-rule-form"

  return (
    <Modal
      title={editingRule ? t`Edit CORS Rule` : t`Add CORS Rule`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      size="large"
      modalFooter={
        <ModalFooter className="bg-theme-background-lvl-0 sticky bottom-0 z-50 flex justify-end">
          <ButtonRow>
            <Button
              variant="subdued"
              onClick={() => {
                trackClose()
                handleClose()
              }}
              disabled={isSaving}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const submitButton = document.querySelector(`#${formId}`) as HTMLFormElement
                submitButton?.requestSubmit()
              }}
              disabled={!isFormValid || isSaving || isCorsLoading || !!corsError}
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
                <Trans>Create Rule</Trans>
              )}
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      {isCorsLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner variant="primary" size="large" />
        </div>
      )}

      {corsError && (
        <Message variant="error" title={t`Failed to load CORS configuration`}>
          {corsError.message}
        </Message>
      )}

      {setMutation.isError && (
        <Message variant="error" title={t`Failed to save CORS rule`}>
          {setMutation.error?.message}
        </Message>
      )}

      {!isCorsLoading && !corsError && (
        <CorsRuleForm
          key={editingIndex ?? "new"}
          editingRule={editingRule}
          onSubmit={handleSubmit}
          formId={formId}
          onValidationChange={setIsFormValid}
        />
      )}
    </Modal>
  )
}

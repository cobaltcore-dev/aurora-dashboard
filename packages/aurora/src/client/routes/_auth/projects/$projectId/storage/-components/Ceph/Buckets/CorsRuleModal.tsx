import { Modal } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { CorsRuleForm } from "./CorsRuleForm"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"

interface CorsRuleModalProps {
  isOpen: boolean
  editingRule: CorsRuleRead | null // null = adding, non-null = editing
  editingIndex: number | null // For the key remount trick
  onSubmit: (rule: CorsRuleRead) => void
  onClose: () => void
}

/**
 * Modal wrapper for CorsRuleForm
 *
 * Renders the form for adding or editing a single CORS rule.
 * Edits draft state only; does not call `cors.set` directly.
 */
export const CorsRuleModal = ({ isOpen, editingRule, editingIndex, onSubmit, onClose }: CorsRuleModalProps) => {
  const { t } = useLingui()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.cors",
  })

  const handleClose = () => {
    trackClose()
    resetTracking()
    onClose()
  }

  const handleSubmit = (rule: CorsRuleRead) => {
    markSubmitted()
    onSubmit(rule)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <Modal title={editingRule ? t`Edit CORS Rule` : t`Add CORS Rule`} open={isOpen} onCancel={handleClose} size="large">
      {/* The key remount resets the form between rules, matching CorsModal.tsx:341 */}
      <CorsRuleForm
        key={editingIndex ?? "new"}
        editingRule={editingRule}
        onSubmit={handleSubmit}
        onCancel={handleClose}
      />
    </Modal>
  )
}

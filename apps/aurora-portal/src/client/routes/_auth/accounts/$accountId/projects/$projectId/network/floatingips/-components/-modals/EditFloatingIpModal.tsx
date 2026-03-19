import React, { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  Button,
  ButtonRow,
  Spinner,
  ModalFooter,
  Textarea,
  Message,
} from "@cloudoperators/juno-ui-components"
import type { FloatingIp, FloatingIpIdInput, FloatingIpUpdateRequest } from "@/server/Network/types/floatingIp"

interface EditFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate?: (floatingIpId: string, data: Omit<FloatingIpIdInput, "floatingIpId">) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

const MAX_DESCRIPTION_LENGTH = 255

export const EditFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: EditFloatingIpModalProps) => {
  const { t } = useLingui()
  const [isTouched, setIsTouched] = useState(false)

  // Update properties when floatingIp changes
  useEffect(() => {
    setIsTouched(false)
  }, [floatingIp])

  const normalizedDescription = descriptionFieldValue ?? ""
  const trimmedDescription = normalizedDescription.trim()

  const descriptionError = useMemo(() => {
    if (!isTouched) {
      return ""
    }

    if (!trimmedDescription) {
      return t`Description is required`
    }

    if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
      return t`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
    }

    return ""
  }, [isTouched, trimmedDescription, normalizedDescription.length, t])

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescriptionFieldValue(e.target.value)
    if (!isTouched) {
      setIsTouched(true)
    }
  }

  const handleSubmit = async () => {
    setIsTouched(true)

    if (!validateForm()) {
      return
    }

    if (onUpdate) {
      const updateData: Omit<FloatingIpUpdateRequest, "floatingip_id"> = {
        port_id: null,
        description: properties.description.trim() || undefined,
      }

      await onUpdate(floatingIp.id, updateData)
    }
  }

  const handleClose = () => {
    setErrors({})
    onClose()
  }

  const isDescriptionChanged = normalizedDescription !== (floatingIp.description ?? "")
  const isDescriptionInvalid = !trimmedDescription || normalizedDescription.length > MAX_DESCRIPTION_LENGTH
  const isSaveDisabled = isLoading || !isDescriptionChanged || isDescriptionInvalid

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="large"
      title={t`Edit Floating IP`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary"
              onClick={(e) => {
                handleSubmit(e)
              }}
              disabled={isLoading}
              data-testid="update-floating-ip-button"
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Update Floating IP</Trans>}
            </Button>
            <Button variant="default" onClick={handleClose} disabled={isLoading}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      {/* Error Message */}
      {error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {error}
        </Message>
      )}

      {isLoading && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-sm text-gray-600">
            <Trans>Updating Floating IP...</Trans>
          </span>
        </div>
      )}

      {!isLoading && (
        <Form className="mb-6">
          <FormSection className="mb-6">
            <FormRow className="mb-6">
              <Textarea
                id="description"
                name="description"
                label={t`Description`}
                value={properties.description}
                onChange={handleInputChange}
                placeholder={t`Description`}
                disabled={isLoading}
                rows={3}
              />
            </FormRow>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

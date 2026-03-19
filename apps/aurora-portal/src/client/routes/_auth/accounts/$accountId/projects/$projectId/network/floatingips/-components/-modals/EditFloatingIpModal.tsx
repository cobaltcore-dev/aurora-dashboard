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

interface FloatingIpState {
  description: string
}

export const EditFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: EditFloatingIpModalProps) => {
  const { t } = useLingui()

  const [properties, setProperties] = useState<FloatingIpState>({
    description: floatingIp.description || "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Update properties when floatingIp changes
  useEffect(() => {
    setProperties({
      description: floatingIp.description || "",
    })
  }, [floatingIp])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setProperties((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

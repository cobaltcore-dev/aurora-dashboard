import React, { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  TextInput,
  Button,
  ButtonRow,
  Spinner,
  ModalFooter,
  Textarea,
  Message,
} from "@cloudoperators/juno-ui-components"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"

interface EditSecurityGroupModalProps {
  securityGroup: SecurityGroup
  open: boolean
  onClose: () => void
  onUpdate?: (
    securityGroupId: string,
    data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">
  ) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

interface SecurityGroupProperties {
  name: string
  description: string
}

export const EditSecurityGroupModal: React.FC<EditSecurityGroupModalProps> = ({
  securityGroup,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}) => {
  const { t } = useLingui()

  const [properties, setProperties] = useState<SecurityGroupProperties>({
    name: securityGroup.name || "",
    description: securityGroup.description || "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Update properties when securityGroup changes
  useEffect(() => {
    setProperties({
      name: securityGroup.name || "",
      description: securityGroup.description || "",
    })
  }, [securityGroup])

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

    if (!properties.name || properties.name.trim() === "") {
      newErrors.name = t`Security group name is required`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (onUpdate) {
      // Prepare base update data without stateful
      const updateData: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id"> = {
        name: properties.name.trim(),
        description: properties.description.trim() || undefined,
      }

      // Note: We deliberately do NOT include 'stateful' field here
      // because it requires special 'update_security_group:stateful' permission
      // which needs cloud admin role. Regular users can only update name/description.

      await onUpdate(securityGroup.id, updateData)
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
      title={t`Edit Security Group`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button variant="default" onClick={handleClose} disabled={isLoading}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              onClick={(e) => {
                handleSubmit(e)
              }}
              disabled={isLoading}
              data-testid="update-security-group-button"
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Update Security Group</Trans>}
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
          <span className="text-theme-high text-sm">
            <Trans>Updating security group...</Trans>
          </span>
        </div>
      )}

      {!isLoading && (
        <Form className="mb-6">
          <FormSection className="mb-6">
            <FormRow className="mb-6">
              <TextInput
                id="name"
                name="name"
                label={t`Name`}
                value={properties.name}
                onChange={handleInputChange}
                required
                errortext={errors.name}
                placeholder={t`Type name`}
                disabled={isLoading}
              />
            </FormRow>

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
            {/* Note: Stateful checkbox is not shown here because it requires 'update_security_group:stateful' permission (cloud admin only) */}
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

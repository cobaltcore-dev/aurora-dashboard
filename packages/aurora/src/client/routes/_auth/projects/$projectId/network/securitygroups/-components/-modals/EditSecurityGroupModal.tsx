import React, { useState, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  TextInput,
  Textarea,
  Message,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { validateSecurityGroupField, SecurityGroupFormField, SecurityGroupFieldErrors } from "./securityGroupValidation"

interface EditSecurityGroupModalProps {
  securityGroup: SecurityGroup
  open: boolean
  /** The parent closes the modal once the update succeeds; on failure it passes the message via `error`. */
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

const VALIDATED_FIELDS: SecurityGroupFormField[] = ["name", "description"]

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
  const [errors, setErrors] = useState<SecurityGroupFieldErrors>({})

  // Update properties when securityGroup changes
  useEffect(() => {
    setProperties({
      name: securityGroup.name || "",
      description: securityGroup.description || "",
    })
  }, [securityGroup])

  const validateField = (field: SecurityGroupFormField, value: string) =>
    validateSecurityGroupField(field, value, t, securityGroup.name)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setProperties((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field when user changes the value
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }))
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const field = name as SecurityGroupFormField
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, value),
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: SecurityGroupFieldErrors = {}
    VALIDATED_FIELDS.forEach((field) => {
      const fieldError = validateField(field, properties[field])
      if (fieldError) newErrors[field] = fieldError
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid = () => VALIDATED_FIELDS.every((field) => !validateField(field, properties[field]))

  const handleSubmit = async () => {
    if (isLoading || !validateForm()) {
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

      try {
        await onUpdate(securityGroup.id, updateData)
      } catch {
        // Keep the modal open with the user's input; the parent passes the message via `error`
      }
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
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Update Security Group`}
      disableConfirmButton={!isFormValid() || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      {isLoading && <Status status="progress" title={t`Updating Security Group...`} className="mt-0" />}

      {!isLoading && (
        <Form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {error && (
            <FormRow>
              <Message dismissible={false} variant="error" text={error} />
            </FormRow>
          )}

          <FormSection>
            <FormRow>
              <TextInput
                id="name"
                name="name"
                label={t`Name`}
                value={properties.name}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
                errortext={errors.name}
                helptext={t`1-255 characters. "default" is reserved.`}
              />
            </FormRow>

            <FormRow>
              <Textarea
                id="description"
                name="description"
                label={t`Description`}
                value={properties.description}
                onChange={handleInputChange}
                onBlur={handleBlur}
                errortext={errors.description}
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

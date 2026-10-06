import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  TextInput,
  Checkbox,
  Textarea,
  Message,
  Status,
} from "@cloudoperators/juno-ui-components"
import { CreateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { validateSecurityGroupField, SecurityGroupFormField, SecurityGroupFieldErrors } from "./securityGroupValidation"

interface CreateSecurityGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (securityGroupData: Omit<CreateSecurityGroupInput, "project_id">) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

interface SecurityGroupProperties {
  name: string
  description: string
  stateful: boolean
}

const defaultSecurityGroupValues: SecurityGroupProperties = {
  name: "",
  description: "",
  stateful: true,
}

const VALIDATED_FIELDS: SecurityGroupFormField[] = ["name", "description"]

export const CreateSecurityGroupModal: React.FC<CreateSecurityGroupModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  error = null,
}) => {
  const { t } = useLingui()

  const [properties, setProperties] = useState<SecurityGroupProperties>({ ...defaultSecurityGroupValues })
  const [errors, setErrors] = useState<SecurityGroupFieldErrors>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setProperties((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
      [field]: validateSecurityGroupField(field, value, t),
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: SecurityGroupFieldErrors = {}
    VALIDATED_FIELDS.forEach((field) => {
      const fieldError = validateSecurityGroupField(field, properties[field], t)
      if (fieldError) newErrors[field] = fieldError
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid = () => VALIDATED_FIELDS.every((field) => !validateSecurityGroupField(field, properties[field], t))

  const handleSubmit = async () => {
    if (isLoading || !validateForm()) {
      return
    }

    const securityGroupData: Omit<CreateSecurityGroupInput, "project_id"> = {
      name: properties.name.trim(),
      description: properties.description.trim() || undefined,
      stateful: properties.stateful,
    }

    try {
      await onCreate(securityGroupData)
      handleClose()
    } catch {
      // Keep the modal open with the user's input; the parent passes the message via `error`
    }
  }

  const handleClose = () => {
    setProperties({ ...defaultSecurityGroupValues })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="large"
      title={t`Create Security Group`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Create Security Group`}
      disableConfirmButton={!isFormValid() || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      {isLoading && <Status status="progress" title={t`Creating Security Group...`} className="mt-0" />}

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
                helptext={t`Optional. Up to 255 characters.`}
                rows={3}
              />
            </FormRow>

            <FormRow>
              <Checkbox
                id="stateful"
                name="stateful"
                label={t`Stateful`}
                checked={properties.stateful}
                onChange={handleInputChange}
                helptext={t`Stateful groups track connections, so return traffic is allowed automatically. In a stateless group, return traffic needs its own rules. Cannot be changed after creation.`}
              />
            </FormRow>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

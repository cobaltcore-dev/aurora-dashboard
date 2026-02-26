import React, { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  TextInput,
  Checkbox,
  Button,
  ButtonRow,
  Spinner,
  ModalFooter,
  Textarea,
} from "@cloudoperators/juno-ui-components"
import { CreateSecurityGroupInput } from "@/server/Network/types/securityGroup"

interface CreateSecurityGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (securityGroupData: CreateSecurityGroupInput) => Promise<void>
  isLoading?: boolean
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

export const CreateSecurityGroupModal: React.FC<CreateSecurityGroupModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const { t } = useLingui()

  const [properties, setProperties] = useState<SecurityGroupProperties>({ ...defaultSecurityGroupValues })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

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

    const securityGroupData: CreateSecurityGroupInput = {
      name: properties.name.trim(),
      description: properties.description.trim() || undefined,
      stateful: properties.stateful,
    }

    await onCreate(securityGroupData)
    handleClose()
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
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary"
              onClick={(e) => {
                handleSubmit(e)
              }}
              disabled={isLoading}
              data-testid="create-security-group-button"
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Create Security Group</Trans>}
            </Button>
            <Button variant="default" onClick={handleClose} disabled={isLoading}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      {isLoading && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-sm text-gray-600">
            <Trans>Creating security group...</Trans>
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
                placeholder={t`my-security-group`}
                disabled={isLoading}
                helptext={t`A unique name for the security group`}
              />
            </FormRow>

            <FormRow className="mb-6">
              <Textarea
                id="description"
                name="description"
                label={t`Description`}
                value={properties.description}
                onChange={handleInputChange}
                placeholder={t`Optional description for this security group`}
                disabled={isLoading}
                rows={3}
              />
            </FormRow>

            <FormRow className="mb-0">
              <Checkbox
                id="stateful"
                name="stateful"
                label={t`Stateful`}
                checked={properties.stateful}
                onChange={handleInputChange}
                helptext={t`If enabled, return traffic is automatically allowed (recommended)`}
                disabled={isLoading}
              />
            </FormRow>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

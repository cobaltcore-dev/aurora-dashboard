import React, { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  FormSection,
  TextInput,
  Message,
  Status,
  toast,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { getRBACPolicyAddedToast } from "../../-components/SecurityGroupToastNotifications"

interface AddRBACPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  securityGroupId: string
}

// UUID pattern - supports both formats:
// - With dashes: 12345678-1234-1234-1234-123456789abc
// - Without dashes: 12345678123412341234123456789abc (OpenStack format)
const UUID_WITH_DASHES = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_WITHOUT_DASHES = /^[0-9a-f]{32}$/i

function isValidProjectID(value: string): boolean {
  return UUID_WITH_DASHES.test(value) || UUID_WITHOUT_DASHES.test(value)
}

export function AddRBACPolicyModal({ isOpen, onClose, securityGroupId }: AddRBACPolicyModalProps) {
  const { t } = useLingui()
  const utils = trpcReact.useUtils()
  const projectId = useProjectId()
  const [targetTenant, setTargetTenant] = useState("")
  const [targetTenantError, setTargetTenantError] = useState<string | undefined>()

  const createMutation = trpcReact.network.rbacPolicy.create.useMutation({
    onSuccess: (_, variables) => {
      utils.network.rbacPolicy.list.invalidate({ project_id: projectId, securityGroupId })
      utils.network.securityGroup.getById.invalidate({ project_id: projectId, securityGroupId })
      const { message, ...options } = getRBACPolicyAddedToast(variables.targetTenant)
      toast.success(message, options)
      handleClose()
    },
  })
  const isLoading = createMutation.isPending

  const validateTargetTenant = (value: string): string | undefined => {
    const trimmed = value.trim()
    if (!trimmed) return t`Target project ID is required`
    if (!isValidProjectID(trimmed)) return t`Enter a valid project ID: 32 hexadecimal characters, dashes optional.`
    return undefined
  }

  const getErrorMessage = (errorMessage: string) => {
    const message = errorMessage.toLowerCase()
    if (message.includes("conflict") || message.includes("409")) {
      return t`This security group is already shared with the specified project.`
    }
    if (message.includes("not found") || message.includes("404")) {
      return t`The specified project does not exist or you don't have permission to share with it.`
    }
    if (message.includes("forbidden") || message.includes("403")) {
      return t`You don't have permission to share this security group.`
    }
    return errorMessage
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetTenant(e.target.value)
    // Clear the error while the user edits the value
    setTargetTenantError(undefined)
  }

  const handleSubmit = () => {
    if (isLoading) return

    const error = validateTargetTenant(targetTenant)
    setTargetTenantError(error)
    if (error) return

    createMutation.mutate({
      project_id: projectId,
      securityGroupId,
      targetTenant: targetTenant.trim(),
    })
  }

  const handleClose = () => {
    setTargetTenant("")
    setTargetTenantError(undefined)
    createMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={t`Share Security Group`}
      size="large"
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Share Group`}
      disableConfirmButton={Boolean(validateTargetTenant(targetTenant)) || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      {isLoading && <Status status="progress" title={t`Sharing Security Group...`} className="mt-0" />}

      {!isLoading && (
        <Form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {createMutation.error && (
            <FormRow>
              <Message dismissible={false} variant="error" text={getErrorMessage(createMutation.error.message)} />
            </FormRow>
          )}

          <p className="mb-4">
            <Trans>
              Share this security group with another project. The target project will be able to view and use this
              security group, but will not be able to modify or delete it.
            </Trans>
          </p>

          <FormSection>
            <FormRow>
              <TextInput
                id="targetTenant"
                name="targetTenant"
                label={t`Target Project ID`}
                value={targetTenant}
                onChange={handleChange}
                onBlur={() => setTargetTenantError(validateTargetTenant(targetTenant))}
                required
                errortext={targetTenantError}
                helptext={t`ID of the project to share with: 32 hexadecimal characters, dashes optional. It is shown as Project ID at the top of that project's pages.`}
              />
            </FormRow>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormRow,
  TextInput,
  Button,
  ButtonRow,
  ModalFooter,
  Message,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"

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

  const [targetTenant, setTargetTenant] = useState("")
  const [error, setError] = useState<string | null>(null)

  const createMutation = trpcReact.network.rbacPolicy.create.useMutation({
    onSuccess: () => {
      utils.network.rbacPolicy.list.invalidate({ securityGroupId })
      utils.network.securityGroup.getById.invalidate({ securityGroupId })
      handleClose()
    },
    onError: (error) => {
      // Provide more user-friendly error messages
      const message = error.message.toLowerCase()
      if (message.includes("conflict") || message.includes("409")) {
        setError(t`This security group is already shared with the specified project.`)
      } else if (message.includes("not found") || message.includes("404")) {
        setError(t`The specified project does not exist or you don't have permission to share with it.`)
      } else if (message.includes("forbidden") || message.includes("403")) {
        setError(t`You don't have permission to share this security group.`)
      } else {
        setError(error.message)
      }
    },
  })

  const handleClose = () => {
    setTargetTenant("")
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmedValue = targetTenant.trim()

    // Validate required field
    if (!trimmedValue) {
      setError(t`Target project ID is required`)
      return
    }

    // Validate Project ID format
    if (!isValidProjectID(trimmedValue)) {
      setError(
        t`Invalid project ID format. Must be 32 hexadecimal characters (e.g., b90f9c4bc76140e18540b2cec1299e2a) or UUID format (e.g., 12345678-1234-1234-1234-123456789abc)`
      )
      return
    }

    await createMutation.mutateAsync({
      securityGroupId,
      targetTenant: trimmedValue,
    })
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={t`Share Security Group`}
      size="large"
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button type="submit" form="add-rbac-policy-form" variant="primary" disabled={createMutation.isPending}>
              <Trans>Share</Trans>
            </Button>
            <Button onClick={handleClose} variant="subdued">
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      <Form id="add-rbac-policy-form" onSubmit={handleSubmit}>
        <Message variant="info" className="mb-4">
          <Trans>
            Share this security group with another project. The target project will be able to view and use this
            security group, but will not be able to modify or delete it.
          </Trans>
        </Message>

        {error && (
          <Message variant="error" className="mb-4">
            {error}
          </Message>
        )}

        <FormRow>
          <TextInput
            label={t`Target Project ID`}
            value={targetTenant}
            onChange={(e) => setTargetTenant(e.target.value)}
            placeholder={t`e.g., b90f9c4bc76140e18540b2cec1299e2a`}
            required
            helptext={t`Enter the ID of the project you want to share this security group with. You can find project IDs in the account/project switcher or in the Identity service.`}
          />
        </FormRow>
      </Form>
    </Modal>
  )
}

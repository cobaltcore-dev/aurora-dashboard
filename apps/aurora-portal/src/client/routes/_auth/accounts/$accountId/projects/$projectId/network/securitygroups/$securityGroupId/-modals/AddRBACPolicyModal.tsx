import { z } from "zod"
import { useForm } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormSection,
  TextInput,
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

  const formSchema = z.object({
    targetTenant: z
      .string()
      .min(1, t`Target project ID is required`)
      .refine(isValidProjectID, {
        message: t`Invalid project ID format. Must be 32 hexadecimal characters (e.g., b90f9c4bc76140e18540b2cec1299e2a) or UUID format (e.g., 12345678-1234-1234-1234-123456789abc)`,
      }),
  })

  const createMutation = trpcReact.network.rbacPolicy.create.useMutation({
    onSuccess: () => {
      utils.network.rbacPolicy.list.invalidate({ securityGroupId })
      utils.network.securityGroup.getById.invalidate({ securityGroupId })
      handleClose()
    },
  })

  const form = useForm({
    defaultValues: {
      targetTenant: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (createMutation.isPending) return

      createMutation.mutate({
        securityGroupId,
        targetTenant: value.targetTenant.trim(),
      })
    },
  })

  const handleClose = () => {
    form.reset()
    createMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={t`Share Security Group`}
      size="large"
      onConfirm={form.handleSubmit}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Share`}
      disableConfirmButton={createMutation.isPending}
    >
      <Message variant="info" className="mb-4">
        <Trans>
          Share this security group with another project. The target project will be able to view and use this
          security group, but will not be able to modify or delete it.
        </Trans>
      </Message>

      {createMutation.error && (
        <Message variant="error" className="mb-4">
          {(() => {
            const message = createMutation.error.message.toLowerCase()
            if (message.includes("conflict") || message.includes("409")) {
              return t`This security group is already shared with the specified project.`
            } else if (message.includes("not found") || message.includes("404")) {
              return t`The specified project does not exist or you don't have permission to share with it.`
            } else if (message.includes("forbidden") || message.includes("403")) {
              return t`You don't have permission to share this security group.`
            } else {
              return createMutation.error.message
            }
          })()}
        </Message>
      )}

      <Form
        className="mb-0"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FormSection>
          <form.Field
            name="targetTenant"
            children={(field) => (
              <TextInput
                id={field.name}
                name={field.name}
                label={t`Target Project ID`}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={t`e.g., b90f9c4bc76140e18540b2cec1299e2a`}
                required
                helptext={t`Enter the ID of the project you want to share this security group with. You can find project IDs in the account/project switcher or in the Identity service.`}
                disabled={createMutation.isPending}
              />
            )}
          />
        </FormSection>
      </Form>
    </Modal>
  )
}

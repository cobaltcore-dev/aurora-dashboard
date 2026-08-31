import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import {
  Modal,
  Stack,
  Message,
  Form,
  FormSection,
  TextInput,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteRBACPolicyDialogProps {
  policy: RBACPolicy
  open: boolean
  onClose: () => void
  onConfirm: (policyId: string) => void
  isLoading: boolean
  error: string | null
}

export function DeleteRBACPolicyDialog({
  policy,
  open,
  onClose,
  onConfirm,
  isLoading,
  error,
}: DeleteRBACPolicyDialogProps) {
  const { t } = useLingui()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen: open,
    actionPrefix: "network.securitygroup.rbacpolicy.delete",
  })

  const formSchema = z.object({
    confirm: z.string().refine((value) => value === "remove", {
      message: t`Type "remove" to confirm`,
    }),
  })

  const form = useForm({
    defaultValues: {
      confirm: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (isLoading) return

      markSubmitted()
      onConfirm(policy.id)
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "remove")

  const handleClose = () => {
    trackClose()
    form.reset()
    resetTracking()
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="small"
      title={t`Remove RBAC Policy`}
      onConfirm={form.handleSubmit}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={isLoading ? t`Removing...` : t`Remove Policy`}
      confirmButtonVariant="primary-danger"
      disableConfirmButton={canDelete || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>
            This action cannot be undone. The target project will lose access to this security group immediately.
          </Trans>
        </p>

        <DescriptionList>
          <DescriptionTerm>
            <Trans>Target Project ID</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{policy.target_tenant}</DescriptionDefinition>

          <DescriptionTerm>
            <Trans>Action</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{policy.action}</DescriptionDefinition>

          <DescriptionTerm>
            <Trans>Object Type</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{policy.object_type}</DescriptionDefinition>
        </DescriptionList>

        <Form
          className="mb-0"
          id="delete-rbac-policy-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <form.Field
              name="confirm"
              children={(field) => (
                <TextInput
                  label={t`Type "remove" to confirm`}
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="remove"
                  autoComplete="off"
                  autoFocus
                  disabled={isLoading}
                  data-testid="remove-policy-confirmation-input"
                  required
                />
              )}
            />
          </FormSection>
        </Form>
      </Stack>
    </Modal>
  )
}

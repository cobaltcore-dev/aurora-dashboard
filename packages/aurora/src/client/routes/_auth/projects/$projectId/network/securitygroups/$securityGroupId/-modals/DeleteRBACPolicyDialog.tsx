import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Modal, Stack, Message, Form, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
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

        <div className="bg-theme-background-lvl-1 rounded p-4">
          <p className="mb-2 font-semibold">
            <Trans>RBAC Policy Details:</Trans>
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              <Trans>Target Project ID</Trans>: {policy.target_tenant}
            </li>
            <li>
              <Trans>Action</Trans>: {policy.action}
            </li>
            <li>
              <Trans>Object Type</Trans>: {policy.object_type}
            </li>
          </ul>
        </div>

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

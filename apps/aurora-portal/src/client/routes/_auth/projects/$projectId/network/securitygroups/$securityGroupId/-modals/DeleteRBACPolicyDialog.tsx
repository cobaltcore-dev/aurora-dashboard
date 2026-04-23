import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Modal, Message, TextInput, Form, FormSection } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"

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

  const formSchema = z.object({
    confirmText: z.string().refine((value) => value === "remove", {
      message: t`Type "remove" to confirm`,
    }),
  })

  const form = useForm({
    defaultValues: {
      confirmText: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (isLoading) return

      onConfirm(policy.id)
      handleClose()
    },
  })

  // Creates a reactive subscription so the component re-renders, which allows the confirm button to enable once the user types "remove"
  const canRemove = useStore(form.store, (state) => state.isSubmitting || state.values.confirmText !== "remove")

  const handleClose = () => {
    form.reset()
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
      disableConfirmButton={isLoading || canRemove}
    >
      <div>
        {/* Error Message */}
        {error && (
          <Message dismissible={false} variant="error" className="mt-4">
            {error}
          </Message>
        )}

        {/* Warning */}
        <Trans>
          This action cannot be undone. The target project will lose access to this security group immediately.
        </Trans>

        {/* Policy Details */}
        <div className="bg-theme-background-lvl-1 mt-4 mb-4 rounded p-4">
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

        {/* Confirmation Input */}
        {!isLoading && (
          <Form
            className="mt-4 mb-0"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FormSection>
              <p className="mb-2 text-sm">
                <Trans>
                  Type <strong>remove</strong> to confirm:
                </Trans>
              </p>
              <form.Field
                name="confirmText"
                children={(field) => (
                  <TextInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t`remove`}
                    autoComplete="off"
                    disabled={isLoading}
                    data-testid="remove-policy-confirmation-input"
                  />
                )}
              />
            </FormSection>
          </Form>
        )}
      </div>
    </Modal>
  )
}

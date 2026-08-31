import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import React from "react"
import { Modal, Stack, Message, Form, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteSecurityGroupDialogProps {
  isOpen: boolean
  securityGroup: SecurityGroup
  onClose: () => void
  onDelete: (securityGroupId: string) => void
  isDeleting?: boolean
  error?: string | null
}

export const DeleteSecurityGroupDialog: React.FC<DeleteSecurityGroupDialogProps> = ({
  isOpen,
  onClose,
  securityGroup,
  onDelete,
  isDeleting = false,
  error = null,
}) => {
  const { t } = useLingui()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "network.securitygroup.delete",
  })

  const formSchema = z.object({
    confirm: z.string().refine((value) => value === "delete", {
      message: t`Type "delete" to confirm`,
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
      if (isDeleting) return

      markSubmitted()
      onDelete(securityGroup.id)
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "delete")

  const securityGroupName = securityGroup.name || securityGroup.id

  const handleClose = () => {
    trackClose()
    form.reset()
    resetTracking()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="small"
      title={t`Delete Security Group "${securityGroupName}"`}
      confirmButtonLabel={isDeleting ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      onConfirm={form.handleSubmit}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={canDelete || isDeleting}
      disableCancelButton={isDeleting}
      disableCloseButton={isDeleting}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>This action cannot be undone. The security group will be permanently deleted.</Trans>
        </p>

        <Form
          className="mb-0"
          id="delete-security-group-form"
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
                  label={t`Type "delete" to confirm`}
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="delete"
                  disabled={isDeleting}
                  autoComplete="off"
                  autoFocus
                  data-testid="delete-confirmation-input"
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

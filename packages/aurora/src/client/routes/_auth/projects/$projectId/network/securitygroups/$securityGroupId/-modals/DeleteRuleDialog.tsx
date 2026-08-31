import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Modal, Stack, Message, Form, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteRuleDialogProps {
  rule: SecurityGroupRule | null
  open: boolean
  onClose: () => void
  onConfirm: (ruleId: string) => void
  isLoading: boolean
  error: string | null
}

export function DeleteRuleDialog({ rule, open, onClose, onConfirm, isLoading, error }: DeleteRuleDialogProps) {
  const { t } = useLingui()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen: open,
    actionPrefix: "network.securitygroup.rule.delete",
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
      if (!rule || isLoading) return

      markSubmitted()
      onConfirm(rule.id)
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "delete")

  const handleClose = () => {
    trackClose()
    form.reset()
    resetTracking()
    onClose()
  }

  if (!rule) return null

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="small"
      title={t`Delete Security Group Rule`}
      confirmButtonLabel={isLoading ? t`Deleting...` : t`Delete Rule`}
      confirmButtonVariant="primary-danger"
      onConfirm={form.handleSubmit}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={canDelete || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>This action cannot be undone. The rule will be permanently deleted.</Trans>
        </p>

        <div className="bg-theme-background-lvl-1 rounded p-4">
          <p className="mb-2 font-semibold">
            <Trans>Rule Details:</Trans>
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              <Trans>Direction</Trans>: {rule.direction}
            </li>
            {rule.description && (
              <li>
                <Trans>Description</Trans>: {rule.description}
              </li>
            )}
            <li>
              <Trans>Ethertype</Trans>: {rule.ethertype}
            </li>
            {rule.protocol && (
              <li>
                <Trans>Protocol</Trans>: {rule.protocol}
              </li>
            )}
            {rule.port_range_min !== null && rule.port_range_max !== null && (
              <li>
                <Trans>Port Range</Trans>:{" "}
                {rule.port_range_min === rule.port_range_max
                  ? rule.port_range_min
                  : `${rule.port_range_min}-${rule.port_range_max}`}
              </li>
            )}
            {rule.remote_ip_prefix && (
              <li>
                <Trans>Remote IP</Trans>: {rule.remote_ip_prefix}
              </li>
            )}
            {rule.remote_group_id && (
              <li>
                <Trans>Remote Security Group</Trans>: {rule.remote_group_id}
              </li>
            )}
          </ul>
        </div>

        <Form
          className="mb-0"
          id="delete-rule-form"
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
                  autoComplete="off"
                  autoFocus
                  disabled={isLoading}
                  data-testid="delete-rule-confirmation-input"
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

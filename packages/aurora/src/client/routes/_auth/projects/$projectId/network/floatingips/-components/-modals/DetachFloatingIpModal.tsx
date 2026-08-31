import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Message, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { useProjectId } from "@/client/hooks"
import { FloatingIpUpdateFields } from "./EditFloatingIpModal"
import { useModalTracking } from "@/client/hooks/useModalTracking"

export interface DetachFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string, data: FloatingIpUpdateFields) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const DetachFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: DetachFloatingIpModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { floating_ip_address } = floatingIp

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen: open,
    actionPrefix: "network.floatingip.detach",
  })

  const formSchema = z.object({
    detach: z.string().refine((value) => value === "detach", {
      message: t`Type "detach" to confirm`,
    }),
  })

  const form = useForm({
    defaultValues: {
      detach: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (isLoading) return

      markSubmitted()
      await onUpdate(floatingIp.id, {
        project_id: projectId,
        port_id: null,
      })
      handleClose()
    },
  })

  const canDetach = useStore(form.store, (state) => state.isSubmitting || state.values.detach !== "detach")

  const handleClose = () => {
    trackClose()
    form.reset()
    resetTracking()
    onClose()
  }

  return (
    <Modal
      open={open}
      size="small"
      title={t`Detach Floating IP "${floating_ip_address}"`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={isLoading ? t`Detaching...` : t`Detach`}
      confirmButtonVariant="primary-danger"
      onConfirm={form.handleSubmit}
      disableConfirmButton={isLoading || canDetach}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>
            Detaching this Floating IP will remove its association with the current port. The instance will no longer be
            reachable through this address.
          </Trans>
        </p>

        <Form
          className="mb-0"
          id="detach-floating-ip-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <form.Field
              name="detach"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  label={t`Type "detach" to confirm`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="detach"
                  helptext={t`The text must match "detach" in lowercase.`}
                  autoFocus
                  disabled={isLoading}
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

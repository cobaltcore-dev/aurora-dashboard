import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Message, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { useModalTracking } from "@/client/hooks/useModalTracking"

export interface ReleaseFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const ReleaseFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: ReleaseFloatingIpModalProps) => {
  const { t } = useLingui()
  const { floating_ip_address } = floatingIp

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen: open,
    actionPrefix: "network.floatingip.release",
  })

  const formSchema = z.object({
    release: z.string().refine((value) => value === "release", {
      message: t`Type "release" to confirm`,
    }),
  })

  const form = useForm({
    defaultValues: {
      release: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (isLoading) return

      markSubmitted()
      await onUpdate(floatingIp.id)
      handleClose()
    },
  })

  const canRelease = useStore(form.store, (state) => state.isSubmitting || state.values.release !== "release")

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
      title={t`Release Floating IP "${floating_ip_address}"`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={isLoading ? t`Releasing...` : t`Release`}
      confirmButtonVariant="primary-danger"
      onConfirm={form.handleSubmit}
      disableConfirmButton={isLoading || canRelease}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>
            This action is permanent. The address will be removed from your project and returned to the public pool.
            This action cannot be undone.
          </Trans>
        </p>

        <Form
          className="mb-0"
          id="release-floating-ip-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <form.Field
              name="release"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  label={t`Type "release" to confirm`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="release"
                  helptext={t`The text must match "release" in lowercase.`}
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

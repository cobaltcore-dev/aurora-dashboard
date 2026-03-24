import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"

interface ReleaseFloatingIpModalProps {
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

  const formSchema = z.object({
    release: z.string().refine((value) => value === "release", {
      message: t`Type “release” to confirm`,
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

      await onUpdate(floatingIp.id)
      handleClose()
    },
  })

  // creates a reactive subscription so the component re-renders, which allows the confirm button to enable once the user types "release".
  const canRelease = useStore(form.store, (state) => state.isSubmitting || state.values.release !== "release")

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      size="large"
      title={t`Release Floating IP ${floating_ip_address}`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Release`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isLoading || canRelease}
    >
      {error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {error}
        </Message>
      )}

      {isLoading && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Releasing Floating IP...</Trans>
          </span>
        </div>
      )}

      <Stack gap="2.5" direction="vertical" className="mb-2.5">
        <p>
          <Trans>
            This action is permanent. The address will be removed from your project and returned to the public pool.
            This action cannot be undone.
          </Trans>
        </p>
        <p>
          <Trans>
            To confirm this action, type the word <strong>"release"</strong> in the field below.
          </Trans>
        </p>
      </Stack>

      {!isLoading && (
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Type "release" to confirm`}
                  helptext={t`The text must match “release” in lowercase.`}
                  disabled={isLoading}
                  required
                />
              )}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

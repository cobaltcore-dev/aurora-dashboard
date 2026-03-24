import { z } from "zod"
import { useForm } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormSection,
  Button,
  ButtonRow,
  Spinner,
  ModalFooter,
  Message,
  TextInput,
  Stack,
} from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { FloatingIpUpdateFields } from "./EditFloatingIpModal"

interface DetachFloatingIpModalProps {
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
  const { floating_ip_address } = floatingIp

  const formSchema = z.object({
    detach: z.string().refine((value) => value === "detach", {
      message: t`Type “detach” to confirm`,
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

      await onUpdate(floatingIp.id, {
        port_id: null, // Detach by clearing the port association
      })
      handleClose()
    },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="large"
      title={t`Detach Floating IP ${floating_ip_address}`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <form.Subscribe
            selector={(state) => ({
              isSubmitting: state.isSubmitting,
              detachValue: state.values.detach,
            })}
          >
            {({ isSubmitting, detachValue }) => (
              <ButtonRow>
                <Button variant="default" onClick={handleClose} disabled={isLoading || isSubmitting}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => form.handleSubmit()}
                  disabled={isLoading || isSubmitting || detachValue !== "detach"}
                  data-testid="detach-floating-ip-button"
                >
                  {isSubmitting ? <Spinner size="small" /> : <Trans>Detach</Trans>}
                </Button>
              </ButtonRow>
            )}
          </form.Subscribe>
        </ModalFooter>
      }
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
            <Trans>Detaching Floating IP...</Trans>
          </span>
        </div>
      )}

      <Stack gap="2.5" direction="vertical" className="mb-2.5">
        <p>
          <Trans>
            Detaching this Floating IP will remove its association with the current port. The instance will no longer be
            reachable through this address.
          </Trans>
        </p>
        <p>
          <Trans>
            To confirm this action, type the word <strong>“detach”</strong> in the field below.
          </Trans>
        </p>
      </Stack>

      {!isLoading && (
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Type "detach" to confirm`}
                  helptext={t`The text must match “detach” in lowercase.`}
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

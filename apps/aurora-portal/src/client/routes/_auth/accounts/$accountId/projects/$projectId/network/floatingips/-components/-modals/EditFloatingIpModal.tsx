import { z } from "zod"
import { useForm } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormSection,
  FormRow,
  Button,
  ButtonRow,
  Spinner,
  ModalFooter,
  Textarea,
  Message,
} from "@cloudoperators/juno-ui-components"
import type { FloatingIp, FloatingIpUpdateRequest } from "@/server/Network/types/floatingIp"

interface EditFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate?: (floatingIpId: string, data: Omit<FloatingIpUpdateRequest, "floatingip_id">) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

const formSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Description must be at least 1 character.")
    .max(255, "Description must be at most 255 characters."),
})

export const EditFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: EditFloatingIpModalProps) => {
  const { t } = useLingui()
  const { description, floating_ip_address } = floatingIp

  const form = useForm({
    defaultValues: {
      description: description ?? "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (!onUpdate || isLoading) {
        return
      }

      const updateData: Omit<FloatingIpUpdateRequest, "floatingip_id"> = {
        port_id: floatingIp.port_id ?? null,
        description: value.description.trim(),
      }
      await onUpdate(floatingIp.id, updateData)
      handleClose()
    },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Modal
      // Remount the modal when a different Floating IP is selected so TanStack Form picks up fresh defaultValues.
      key={floatingIp.id}
      open={open}
      onCancel={handleClose}
      size="large"
      title={t`Edit Floating IP ${floating_ip_address}`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <form.Subscribe selector={({ isSubmitting, isDirty }) => ({ isSubmitting, isDirty })}>
            {({ isSubmitting, isDirty }) => (
              <ButtonRow>
                <Button variant="default" onClick={handleClose} disabled={isLoading || isSubmitting}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => form.handleSubmit()}
                  disabled={isLoading || isSubmitting || !isDirty}
                  data-testid="update-floating-ip-button"
                >
                  {isSubmitting ? <Spinner size="small" /> : <Trans>Save</Trans>}
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
          <span className="text-sm text-gray-600">
            <Trans>Updating Floating IP...</Trans>
          </span>
        </div>
      )}

      {!isLoading && (
        <Form
          className="mb-6"
          id="edit-floating-ip-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection className="mb-6">
            <FormRow className="mb-6">
              <form.Field
                name="description"
                children={(field) => (
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errortext={field.state.meta.errors.join(", ")}
                    label={t`Description`}
                    placeholder={t`Description`}
                    disabled={isLoading}
                    required
                    maxLength={255}
                  />
                )}
              />
            </FormRow>
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}

import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import {
  Modal,
  Stack,
  Form,
  FormSection,
  TextInput,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Message,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { Trans } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteFlavorModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
  onSuccess: () => void
}

export const DeleteFlavorModal: React.FC<DeleteFlavorModalProps> = ({
  client,
  isOpen,
  onClose,
  project,
  flavor,
  onSuccess,
}) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "compute.flavor.delete",
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
      if (!flavor?.id) {
        setFormError(t`No flavor selected for deletion.`)
        return
      }

      if (isLoading) return

      markSubmitted()
      setFormError(null)

      try {
        setIsLoading(true)

        await client.compute.deleteFlavor.mutate({
          project_id: project,
          flavorId: flavor.id,
        })
        onSuccess()
        handleClose()
      } catch (error) {
        const errorMessage = (error as Error)?.message
          ? translateError((error as Error).message)
          : t`Failed to delete flavor. Please try again.`
        setFormError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "delete")

  const handleClose = () => {
    trackClose()
    setIsLoading(false)
    setFormError(null)
    form.reset()
    resetTracking()
    onClose()
  }

  const confirmLabel = isLoading ? t`Deleting...` : t`Delete Flavor`
  const flavorName = flavor?.name

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={t`Delete Flavor "${flavorName}"`}
      size="small"
      confirmButtonLabel={confirmLabel}
      confirmButtonVariant="primary-danger"
      onConfirm={form.handleSubmit}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={canDelete || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {formError && <Message variant="error">{formError}</Message>}

        <p className="text-theme-default">
          <Trans>This action cannot be undone. The flavor will be permanently deleted.</Trans>
        </p>

        {flavor && (
          <DescriptionList>
            <DescriptionTerm>{t`Name`}</DescriptionTerm>
            <DescriptionDefinition>{flavor.name}</DescriptionDefinition>

            <DescriptionTerm>{t`ID`}</DescriptionTerm>
            <DescriptionDefinition>{flavor.id}</DescriptionDefinition>

            <DescriptionTerm>{t`VCPUs`}</DescriptionTerm>
            <DescriptionDefinition>{flavor.vcpus}</DescriptionDefinition>

            <DescriptionTerm>{t`RAM`}</DescriptionTerm>
            <DescriptionDefinition>{flavor.ram} MiB</DescriptionDefinition>

            <DescriptionTerm>{t`Disk`}</DescriptionTerm>
            <DescriptionDefinition>{flavor.disk} GiB</DescriptionDefinition>

            <DescriptionTerm>{t`Swap`}</DescriptionTerm>
            <DescriptionDefinition>
              {flavor.swap === 0 || flavor.swap === "" ? <Trans>None</Trans> : `${Number(flavor.swap)} MiB`}
            </DescriptionDefinition>
          </DescriptionList>
        )}

        <Form
          className="mb-0"
          id="delete-flavor-form"
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
                  id={field.name}
                  name={field.name}
                  label={t`Type "delete" to confirm`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="delete"
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

import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import {
  Modal,
  Stack,
  TextInput,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Message,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { Trans } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

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

  const { confirmText, setConfirmText, isConfirmed, error, setError, trackClose, markSubmitted } =
    useDeleteConfirmation({
      isOpen,
      confirmWord: "delete",
      trackingPrefix: "compute.flavor",
    })

  const handleClose = () => {
    trackClose()
    setIsLoading(false)
    onClose()
  }

  const handleConfirm = async () => {
    if (!flavor?.id) {
      setError(t`No flavor selected for deletion.`)
      return
    }

    markSubmitted()
    setError(null)

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
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
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
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmed || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

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

        <TextInput
          label={t`Type "delete" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="delete"
          autoFocus
          disabled={isLoading}
        />
      </Stack>
    </Modal>
  )
}

import React, { useState, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import {
  Modal,
  Stack,
  TextInput,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { Trans } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"

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
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")

  useEffect(() => {
    if (!isOpen) {
      setConfirmText("")
      setGeneralError(null)
    }
  }, [isOpen])

  const handleClose = () => {
    setGeneralError(null)
    setConfirmText("")
    setIsLoading(false)
    onClose()
  }

  const handleConfirm = async () => {
    if (!flavor?.id) {
      setGeneralError(t`No flavor selected for deletion.`)
      return
    }

    setGeneralError(null)

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
      setGeneralError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const isConfirmValid = confirmText === "delete"
  const confirmLabel = isLoading ? t`Deleting...` : t`Delete Flavor`

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={t`Delete Flavor`}
      size="large"
      confirmButtonLabel={confirmLabel}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmValid || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {generalError && (
          <p className="text-theme-error" role="alert" aria-live="assertive">
            {generalError}
          </p>
        )}

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

        <div>
          <TextInput
            label={t`Type "delete" to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            autoFocus
          />
        </div>
      </Stack>
    </Modal>
  )
}

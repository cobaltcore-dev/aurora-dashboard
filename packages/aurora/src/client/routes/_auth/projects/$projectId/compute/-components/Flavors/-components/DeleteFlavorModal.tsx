import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import { Modal, Message, Spinner, ModalFooter, Button, ButtonRow, Stack } from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { Trans } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"

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

  const handleDelete = async () => {
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

  const handleClose = () => {
    setGeneralError(null)
    onClose()
  }

  const dismissError = () => {
    setGeneralError(null)
  }

  const flavorItems = [
    { label: t`Name`, value: flavor?.name },
    { label: t`ID`, value: flavor?.id },
    { label: t`VCPUs`, value: flavor?.vcpus },
    { label: t`RAM`, value: `${flavor?.ram} MiB` },
    { label: t`Disk`, value: `${flavor?.disk} GiB` },
    ...(flavor?.swap ? [{ label: t`Swap`, value: `${flavor.swap} MiB` }] : []),
  ]

  return (
    <Modal
      onCancel={handleClose}
      title={t`Delete Flavor`}
      open={isOpen}
      onConfirm={handleDelete}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button variant="primary-danger" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Spinner size="small" /> : <Trans>Delete</Trans>}
            </Button>
            <Button variant="default" onClick={handleClose}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      {isLoading && (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      )}
      {!isLoading && (
        <div>
          {generalError && <Message onDismiss={dismissError} text={generalError} variant="error" className="mb-4" />}

          <Message
            text={t`This action cannot be undone. The flavor will be permanently deleted.`}
            variant="danger"
            className="mb-4"
          />

          {flavor && <TwoColumnDescriptionList items={flavorItems} />}
        </div>
      )}
    </Modal>
  )
}

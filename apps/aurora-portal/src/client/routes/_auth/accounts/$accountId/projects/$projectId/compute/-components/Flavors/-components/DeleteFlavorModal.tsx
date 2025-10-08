import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import {
  Modal,
  Message,
  Spinner,
  ModalFooter,
  Button,
  ButtonRow,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
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

  const handleDelete = async () => {
    if (!flavor?.id) {
      setGeneralError(t`No flavor selected for deletion.`)
      return
    }

    setGeneralError(null)

    try {
      setIsLoading(true)

      await client.compute.deleteFlavor.mutate({
        projectId: project,
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

  return (
    <Modal
      onCancel={handleClose}
      title={t`Delete Flavor`}
      open={isOpen}
      onConfirm={handleDelete}
      modalFooter={
        <ModalFooter className="flex justify-end ">
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
            variant="warning"
            className="mb-4"
          />

          {flavor && (
            <DataGrid columns={2}>
              <DataGridRow>
                <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
                <DataGridCell>{flavor.name}</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
                <DataGridCell>{flavor.id}</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`VCPUs`}</DataGridHeadCell>
                <DataGridCell>{flavor.vcpus}</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`RAM`}</DataGridHeadCell>
                <DataGridCell>{flavor.ram} MiB</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`Disk`}</DataGridHeadCell>
                <DataGridCell>{flavor.disk} GiB</DataGridCell>
              </DataGridRow>
              {flavor.swap && (
                <DataGridRow>
                  <DataGridHeadCell>{t`Swap`}</DataGridHeadCell>
                  <DataGridCell>{flavor.swap} MiB</DataGridCell>
                </DataGridRow>
              )}
            </DataGrid>
          )}
        </div>
      )}
    </Modal>
  )
}

import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import {
  Modal,
  Message,
  Spinner,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Icon,
  Button,
  TextInput,
  ButtonRow, // Import TextInput from Juno
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"

interface DeleteFlavorModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
}

export const EditSpecModal: React.FC<DeleteFlavorModalProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string>("")
  const [newValue, setNewValue] = useState<string>("")
  const [isAddingSpec, setIsAddingSpec] = useState<boolean>(false)

  const handleClose = () => {
    setGeneralError(null)
    setIsAddingSpec(false)
    onClose()
  }

  const dismissError = () => {
    setGeneralError(null)
  }

  const handleAddSpec = () => {
    setIsAddingSpec(true)
  }

  const handleSave = () => {
    if (!newKey || !newValue) {
      setGeneralError(t`Both key and value are required.`)
      return
    }
    console.log("New spec:", { [newKey]: newValue })
    setNewKey("")
    setNewValue("")
    setIsAddingSpec(false)
  }

  const handleCancel = () => {
    setNewKey("")
    setNewValue("")
    setIsAddingSpec(false)
  }

  return (
    <Modal onCancel={handleClose} title={t`Edit Extra Specs`} open={isOpen} size="large">
      {isLoading && (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      )}
      {!isLoading && (
        <div>
          {generalError && <Message onDismiss={dismissError} text={generalError} variant="error" className="mb-4" />}

          {flavor && (
            <>
              <Stack direction="horizontal" className="bg-theme-background-lvl-1 justify-end p-2">
                <Button icon="addCircle" label={t`Add Extra Spec`} onClick={handleAddSpec} variant="primary" />
              </Stack>
              <DataGrid columns={3}>
                <DataGridRow>
                  <DataGridHeadCell>{t`Key`}</DataGridHeadCell>
                  <DataGridHeadCell>{t`Value`}</DataGridHeadCell>
                  <DataGridHeadCell></DataGridHeadCell>
                </DataGridRow>
                {flavor.extra_specs &&
                  Object.entries(flavor.extra_specs).map(([key, value]) => (
                    <DataGridRow key={key}>
                      <DataGridCell>{key}</DataGridCell>
                      <DataGridCell>{value}</DataGridCell>
                      <DataGridCell>
                        <Icon icon="deleteForever" />
                      </DataGridCell>
                    </DataGridRow>
                  ))}
                {isAddingSpec && (
                  <DataGridRow>
                    <DataGridCell className="pl-0">
                      <TextInput value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                    </DataGridCell>
                    <DataGridCell className="pl-0">
                      <TextInput value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                    </DataGridCell>
                    <DataGridCell>
                      <ButtonRow>
                        <Button icon="check" onClick={handleSave} variant="primary" />
                        <Button icon="cancel" onClick={handleCancel} />
                      </ButtonRow>
                    </DataGridCell>
                  </DataGridRow>
                )}
              </DataGrid>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

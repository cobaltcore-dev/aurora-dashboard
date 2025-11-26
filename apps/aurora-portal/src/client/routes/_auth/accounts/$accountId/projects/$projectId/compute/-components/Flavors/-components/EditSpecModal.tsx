import React, { use, Suspense, useState, startTransition } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import {
  Modal,
  Message,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Button,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"
import { SpecFormRow } from "./SpecFormRow"
import { SpecRow } from "./SpecRow"

interface EditSpecModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
}

const createPermissionsPromise = (client: TrpcClient) => {
  return Promise.all([
    client.compute.canUser.query("flavor_specs:create"),
    client.compute.canUser.query("flavor_specs:delete"),
  ]).then(([canCreate, canDelete]) => ({ canCreate, canDelete }))
}

const createExtraSpecsPromise = (client: TrpcClient, project: string, flavorId: string) => {
  return client.compute.getExtraSpecs.query({
    projectId: project,
    flavorId: flavorId,
  })
}

function SpecsLoading() {
  return (
    <DataGridRow>
      <DataGridCell colSpan={3}>
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      </DataGridCell>
    </DataGridRow>
  )
}

function EditSpecContent({
  permissionsPromise,
  extraSpecsPromise,
  client,
  project,
  flavor,
  onSpecsUpdate,
  isAddingSpec,
  setIsAddingSpec,
  setMessage,
}: {
  permissionsPromise: Promise<{ canCreate: boolean; canDelete: boolean }>
  extraSpecsPromise: Promise<Record<string, string>>
  client: TrpcClient
  project: string
  flavor: Flavor
  onSpecsUpdate: (specs: Record<string, string>) => void
  isAddingSpec: boolean
  setIsAddingSpec: (adding: boolean) => void
  message: { text: string; type: "error" | "info" } | null
  setMessage: (msg: { text: string; type: "error" | "info" } | null) => void
}) {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const permissions = use(permissionsPromise)
  const initialExtraSpecs = use(extraSpecsPromise)

  const [extraSpecs, setExtraSpecs] = useState(initialExtraSpecs)
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [errors, setErrors] = useState<{ key?: string; value?: string }>({})
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const validateForm = () => {
    const trimmedKey = key.trim()
    const trimmedValue = value.trim()
    const newErrors: { key?: string; value?: string } = {}

    if (!trimmedKey) {
      newErrors.key = "Key is required."
    } else if (Object.keys(extraSpecs).includes(trimmedKey)) {
      newErrors.key = "Key already exists."
    }

    if (!trimmedValue) {
      newErrors.value = "Value is required."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setKey("")
    setValue("")
    setErrors({})
  }

  const handleSave = async () => {
    if (!validateForm()) {
      setMessage({ text: t`Please fix the validation errors below.`, type: "error" })
      return
    }

    try {
      const trimmedKey = key.trim()
      const trimmedValue = value.trim()

      await client.compute.createExtraSpecs.mutate({
        projectId: project,
        flavorId: flavor.id,
        extra_specs: { [trimmedKey]: trimmedValue },
      })

      const newSpecs = { [trimmedKey]: trimmedValue, ...extraSpecs }
      setExtraSpecs(newSpecs)
      onSpecsUpdate(newSpecs)

      setMessage({
        text: t`Metadata "${trimmedKey}" has been added successfully.`,
        type: "info",
      })
      resetForm()
      setIsAddingSpec(false)
    } catch (error) {
      setMessage({
        text: translateError(error instanceof Error ? error.message : "Failed to create extra spec"),
        type: "error",
      })
    }
  }

  const handleDelete = async (keyToDelete: string) => {
    try {
      setIsDeleting(keyToDelete)
      await client.compute.deleteExtraSpec.mutate({
        projectId: project,
        flavorId: flavor.id,
        key: keyToDelete,
      })

      const newSpecs = { ...extraSpecs }
      delete newSpecs[keyToDelete]
      setExtraSpecs(newSpecs)
      onSpecsUpdate(newSpecs)

      setMessage({
        text: t`Metadata "${keyToDelete}" has been deleted successfully.`,
        type: "info",
      })
    } catch (error) {
      setMessage({
        text: translateError(error instanceof Error ? error.message : `Failed to delete extra spec "${keyToDelete}"`),
        type: "error",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleKeyChange = (newKey: string) => {
    setKey(newKey)
    if (errors.key) setErrors((prev) => ({ ...prev, key: undefined }))
  }

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    if (errors.value) setErrors((prev) => ({ ...prev, value: undefined }))
  }

  const shouldShowEmptyState = Object.keys(extraSpecs).length === 0 && !isAddingSpec

  return (
    <>
      {permissions.canCreate && (
        <Stack direction="horizontal" className="bg-theme-background-lvl-1 justify-end p-2">
          <Button
            label={t`Add Metadata`}
            data-testid="addExtraButton"
            onClick={() => setIsAddingSpec(true)}
            variant="primary"
            disabled={isAddingSpec}
          />
        </Stack>
      )}

      <DataGrid columns={3}>
        <DataGridRow>
          <DataGridHeadCell>{t`Key`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Value`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {isAddingSpec && (
          <SpecFormRow
            specKey={key}
            value={value}
            errors={errors}
            isLoading={false}
            onKeyChange={handleKeyChange}
            onValueChange={handleValueChange}
            onSave={handleSave}
            onCancel={() => {
              resetForm()
              setIsAddingSpec(false)
              setMessage(null)
            }}
          />
        )}

        {Object.entries(extraSpecs).map(([specKey, specValue]) => (
          <SpecRow
            key={specKey}
            specKey={specKey}
            value={specValue}
            isDeleting={isDeleting === specKey}
            onDelete={() => handleDelete(specKey)}
            canDelete={permissions.canDelete}
          />
        ))}

        {shouldShowEmptyState && (
          <DataGridRow>
            <DataGridCell colSpan={3} className="text-center py-4 text-theme-default">
              {t`No extra specs found. Click "Add Metadata" to create one.`}
            </DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
    </>
  )
}

export const EditSpecModal: React.FC<EditSpecModalProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()

  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null)
  const [isAddingSpec, setIsAddingSpec] = useState(false)
  const [extraSpecsPromise, setExtraSpecsPromise] = useState<Promise<Record<string, string>> | null>(null)

  const permissionsPromise = React.useMemo(() => (isOpen ? createPermissionsPromise(client) : null), [client, isOpen])

  React.useEffect(() => {
    if (isOpen && flavor?.id) {
      startTransition(() => {
        setExtraSpecsPromise(createExtraSpecsPromise(client, project, flavor.id))
      })
    }
  }, [isOpen, flavor?.id, client, project])

  const handleClose = () => {
    setMessage(null)
    setIsAddingSpec(false)
    setExtraSpecsPromise(null)
    onClose()
  }

  const handleSpecsUpdate = (specs: Record<string, string>) => {
    startTransition(() => {
      setExtraSpecsPromise(Promise.resolve(specs))
    })
  }

  if (!isOpen || !flavor || !permissionsPromise || !extraSpecsPromise) {
    return null
  }

  return (
    <Modal onCancel={handleClose} title={t`Edit Metadata`} open={isOpen} size="large">
      <div>
        {message && (
          <Message onDismiss={() => setMessage(null)} text={message.text} variant={message.type} className="mb-4" />
        )}

        <Suspense fallback={<SpecsLoading />}>
          <EditSpecContent
            permissionsPromise={permissionsPromise}
            extraSpecsPromise={extraSpecsPromise}
            client={client}
            project={project}
            flavor={flavor}
            onSpecsUpdate={handleSpecsUpdate}
            isAddingSpec={isAddingSpec}
            setIsAddingSpec={setIsAddingSpec}
            message={message}
            setMessage={setMessage}
          />
        </Suspense>
      </div>
    </Modal>
  )
}

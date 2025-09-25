import React, { useState, useEffect, useCallback } from "react"
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
import { useExtraSpecs } from "./useExtraSpecs"
import { useSpecForm } from "./useSpecForm"
import { SpecFormRow } from "./SpecFormRow"
import { SpecRow } from "./SpecRow"

interface EditSpecModalProps {
  client: TrpcClient
  isOpen: boolean
  onClose: () => void
  project: string
  flavor: Flavor | null
}

export const EditSpecModal: React.FC<EditSpecModalProps> = ({ client, isOpen, onClose, project, flavor }) => {
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const extraSpecs = useExtraSpecs(client, project, flavor?.id)
  const form = useSpecForm(Object.keys(extraSpecs.extraSpecs))

  const [isAddingSpec, setIsAddingSpec] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  useEffect(() => {
    if (isOpen && flavor?.id) {
      extraSpecs.fetchExtraSpecs()
    }
  }, [isOpen, flavor?.id, extraSpecs.fetchExtraSpecs])

  const handleClose = useCallback(() => {
    setMessage(null)
    form.reset()
    setIsAddingSpec(false)
    onClose()
  }, [form, onClose])

  const handleSave = useCallback(async () => {
    if (!form.validate()) {
      setMessage({ text: t`Please fix the validation errors below.`, type: "error" })
      return
    }

    try {
      await extraSpecs.addExtraSpec(form.trimmedKey, form.trimmedValue)
      setMessage({
        text: t`Extra spec "${form.trimmedKey}" has been added successfully.`,
        type: "success",
      })
      form.reset()
      setIsAddingSpec(false)
    } catch (error) {
      setMessage({
        text: translateError(error instanceof Error ? error.message : "Failed to create extra spec"),
        type: "error",
      })
    }
  }, [form, extraSpecs, translateError, t])

  const handleDelete = useCallback(
    async (key: string) => {
      try {
        setIsDeleting(key)
        await extraSpecs.deleteExtraSpec(key)
        setMessage({ text: t`Extra spec "${key}" has been deleted successfully.`, type: "success" })
      } catch (error) {
        setMessage({
          text: translateError(error instanceof Error ? error.message : `Failed to delete extra spec "${key}"`),
          type: "error",
        })
      } finally {
        setIsDeleting(null)
      }
    },
    [extraSpecs, translateError, t]
  )

  const renderMessage = () => {
    if (!message) return null

    return <Message onDismiss={() => setMessage(null)} text={message.text} variant={message.type} className="mb-4" />
  }

  const renderEmptyState = () => (
    <DataGridRow>
      <DataGridCell colSpan={3} className="text-center py-4 text-theme-default">
        {t`No extra specs found. Click "Add Extra Spec" to create one.`}
      </DataGridCell>
    </DataGridRow>
  )

  const shouldShowEmptyState = !extraSpecs.isLoading && Object.keys(extraSpecs.extraSpecs).length === 0 && !isAddingSpec

  return (
    <Modal onCancel={handleClose} title={t`Edit Extra Specs`} open={isOpen} size="large">
      <div>
        {renderMessage()}

        {flavor && (
          <>
            <Stack direction="horizontal" className="bg-theme-background-lvl-1 justify-end p-2">
              <Button
                icon="addCircle"
                label={t`Add Extra Spec`}
                data-testid="addExtraButton"
                onClick={() => setIsAddingSpec(true)}
                variant="primary"
                disabled={isAddingSpec}
              />
            </Stack>

            <DataGrid columns={3}>
              <DataGridRow>
                <DataGridHeadCell>{t`Key`}</DataGridHeadCell>
                <DataGridHeadCell>{t`Value`}</DataGridHeadCell>
                <DataGridHeadCell></DataGridHeadCell>
              </DataGridRow>

              {isAddingSpec && (
                <SpecFormRow
                  form={form}
                  isLoading={extraSpecs.isLoading}
                  onSave={handleSave}
                  onCancel={() => {
                    form.reset()
                    setIsAddingSpec(false)
                    setMessage(null)
                  }}
                />
              )}

              {Object.entries(extraSpecs.extraSpecs).map(([key, value]) => (
                <SpecRow
                  key={key}
                  specKey={key}
                  value={value}
                  isDeleting={isDeleting === key}
                  onDelete={() => handleDelete(key)}
                />
              ))}

              {extraSpecs.isLoading && (
                <DataGridRow>
                  <DataGridCell colSpan={3}>
                    <Stack distribution="center" alignment="center">
                      <Spinner variant="primary" />
                    </Stack>
                  </DataGridCell>
                </DataGridRow>
              )}
              {shouldShowEmptyState && renderEmptyState()}
            </DataGrid>
          </>
        )}
      </div>
    </Modal>
  )
}

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Status, Checkbox, ComboBox, ComboBoxOption } from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { useProjectId } from "@/client/hooks/useProjectId"

const MAX_COMBO_OPTIONS = 50

interface ConfigureVersioningModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const ConfigureVersioningModal = ({
  isOpen,
  container,
  onClose,
  onSuccess,
  onError,
}: ConfigureVersioningModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()

  const {
    data: info,
    isLoading,
    isError: isMetaError,
    error: metaError,
  } = trpcReact.storage.swift.getContainerMetadata.useQuery(
    { project_id: projectId, container: container?.name ?? "" },
    { enabled: isOpen && container !== null }
  )

  const { data: containers } = trpcReact.storage.swift.listContainers.useQuery(
    { project_id: projectId },
    { enabled: isOpen }
  )

  const [containerSearch, setContainerSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleContainerSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setContainerSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  const filteredContainers =
    debouncedSearch.trim().length > 0
      ? (containers ?? []).filter(
          (c) => c.name !== container?.name && c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : []

  const visibleContainers = filteredContainers.slice(0, MAX_COMBO_OPTIONS)
  const hiddenCount = filteredContainers.length - visibleContainers.length

  const utils = trpcReact.useUtils()

  const [versionsEnabled, setVersionsEnabled] = useState(false)
  const [versionsLocation, setVersionsLocation] = useState("")

  useEffect(() => {
    if (!info) return
    setVersionsEnabled(!!(info.versionsEnabled || info.versionsLocation || info.historyLocation))
    setVersionsLocation(info.versionsLocation || info.historyLocation || "")
  }, [info])

  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  const resetForm = () => {
    setVersionsEnabled(false)
    setVersionsLocation("")
    setContainerSearch("")
    setDebouncedSearch("")
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    updateMutation.reset()
  }

  const updateMutation = trpcReact.storage.swift.updateContainerMetadata.useMutation({
    onSuccess: () => {
      utils.storage.swift.getContainerMetadata.invalidate({ container: container!.name })
      utils.storage.swift.listContainers.invalidate()
      onSuccess?.(container!.name)
      handleClose()
    },
    onError: (error) => {
      onError?.(container!.name, error.message)
      handleClose()
    },
  })

  const handleSubmit = () => {
    if (!container) return

    const wasVersioned = !!(info?.versionsEnabled || info?.versionsLocation || info?.historyLocation)
    const previousLocation = info?.versionsLocation || info?.historyLocation || ""

    updateMutation.mutate({
      project_id: projectId,
      container: container.name,
      versionsLocation:
        versionsEnabled && (!wasVersioned || versionsLocation !== previousLocation) && versionsLocation
          ? versionsLocation
          : undefined,
      removeVersionsLocation: !versionsEnabled && wasVersioned ? true : undefined,
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen || !container) return null

  const containerName = container.name
  const isBusy = isLoading || updateMutation.isPending

  const initialVersionsEnabled = !!(info?.versionsEnabled || info?.versionsLocation || info?.historyLocation)
  const initialVersionsLocation = info?.versionsLocation || info?.historyLocation || ""

  const isUnchanged = versionsEnabled === initialVersionsEnabled && versionsLocation === initialVersionsLocation

  return (
    <Modal
      title={t`Configure Versioning`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={updateMutation.isPending ? t`Saving...` : t`Save`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isBusy || isUnchanged || (versionsEnabled && !versionsLocation)}
    >
      {isLoading ? (
        <Status status="progress" title={t`Loading Container Properties...`} className="mt-0" />
      ) : isMetaError ? (
        <Status
          status="error"
          title={t`Failed to Load Container Properties`}
          body={metaError?.message ?? t`Unknown Error`}
          className="mt-0"
        />
      ) : (
        <Stack direction="vertical" gap="4">
          <p className="text-theme-default">
            <Trans>
              Store previous versions of objects in container <strong>{containerName}</strong> when they are overwritten
              or deleted.
            </Trans>
          </p>

          {/* Case 1: server-side versioning active with no specific container — read-only */}
          {initialVersionsEnabled && versionsEnabled && !versionsLocation && !initialVersionsLocation ? (
            <Checkbox
              label={t`Versioning is enabled`}
              checked
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (!e.target.checked) {
                  setVersionsEnabled(false)
                  setVersionsLocation("")
                  setContainerSearch("")
                  setDebouncedSearch("")
                }
              }}
              disabled={true}
            />
          ) : !versionsEnabled && !versionsLocation ? (
            /* Case 2: nothing enabled, nothing selected */
            <Checkbox
              label={t`Store old object versions`}
              checked={false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVersionsEnabled(e.target.checked)}
              disabled={isBusy}
            />
          ) : (
            /* Case 3: checkbox checked or a container is selected */
            <Stack direction="vertical" gap="1">
              <Checkbox
                label={t`Store old object versions in container:`}
                checked={versionsEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setVersionsEnabled(e.target.checked)
                  if (!e.target.checked) {
                    setVersionsLocation("")
                    setContainerSearch("")
                    setDebouncedSearch("")
                  }
                }}
                disabled={isBusy}
              />
              {versionsEnabled && (
                <div className="pl-6">
                  <ComboBox
                    value={versionsLocation}
                    onChange={(value: string) => setVersionsLocation(value)}
                    onInputChange={handleContainerSearch}
                    placeholder={t`Type to search containers...`}
                    helptext={(() => {
                      if (containerSearch.trim().length === 0) return t`Start typing to search for a container`
                      if (hiddenCount > 0) {
                        const maxOptions = MAX_COMBO_OPTIONS
                        const totalCount = filteredContainers.length
                        return t`Showing first ${maxOptions} of ${totalCount} — refine your search to narrow results`
                      }
                      return undefined
                    })()}
                    disabled={isBusy}
                  >
                    {visibleContainers.map((c) => (
                      <ComboBoxOption key={c.name} value={c.name}>
                        {c.name}
                      </ComboBoxOption>
                    ))}
                  </ComboBox>
                </div>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Modal>
  )
}

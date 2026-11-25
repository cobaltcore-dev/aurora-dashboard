import { useState, useEffect, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  DateTimePicker,
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
  Modal,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { formatSwiftDate } from "@/client/utils/formatSwiftDate"
import { ObjectRow } from "./"

const formatDate = (iso: string): string => formatSwiftDate(iso) ?? "- -"

interface ScheduleObjectDeletionModalProps {
  isOpen: boolean
  object: ObjectRow | null
  onClose: () => void
  onSuccess?: (objectName: string) => void
  onError?: (objectName: string, errorMessage: string) => void
}

export const ScheduleObjectDeletionModal = ({
  isOpen,
  object,
  onClose,
  onSuccess,
  onError,
}: ScheduleObjectDeletionModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { containerName } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
  })

  const utils = trpcReact.useUtils()

  const {
    data: metadataRaw,
    isLoading,
    isError: isMetaError,
    error: metaError,
  } = trpcReact.storage.swift.getObjectMetadata.useQuery(
    { project_id: projectId, container: containerName, object: object?.name ?? "" },
    { enabled: isOpen && object !== null, refetchOnWindowFocus: false }
  )

  const [expiresAt, setExpiresAt] = useState("")
  const originalExpiresAtRef = useRef("")
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const displayNameRef = useRef("")
  const objectNameRef = useRef("")

  useEffect(() => {
    if (!metadataRaw) return
    const rawExpires = metadataRaw.deleteAt != null ? new Date(metadataRaw.deleteAt * 1000).toISOString() : ""
    setExpiresAt(rawExpires)
    originalExpiresAtRef.current = rawExpires
  }, [metadataRaw])

  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  const resetForm = () => {
    setExpiresAt("")
    originalExpiresAtRef.current = ""
    updateMutation.reset()
  }

  const hasChanges = expiresAt !== originalExpiresAtRef.current

  const updateMutation = trpcReact.storage.swift.updateObjectMetadata.useMutation({
    onSuccess: () => {
      utils.storage.swift.getObjectMetadata.invalidate({
        project_id: projectId,
        container: containerName,
        object: objectNameRef.current,
      })
      utils.storage.swift.listObjects.invalidate({ project_id: projectId, container: containerName })
      onSuccess?.(displayNameRef.current)
      handleClose()
    },
    onError: (error) => {
      onError?.(displayNameRef.current, error.message)
      handleClose()
    },
  })

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = () => {
    if (!object) return

    displayNameRef.current = object.displayName
    objectNameRef.current = object.name

    if (expiresAt) {
      updateMutation.mutate({
        project_id: projectId,
        container: containerName,
        object: object.name,
        deleteAt: Math.floor(new Date(expiresAt).getTime() / 1000),
      })
    } else {
      updateMutation.mutate({
        project_id: projectId,
        container: containerName,
        object: object.name,
        removeDeleteAt: true,
      })
    }
  }

  if (!isOpen || !object) return null

  const displayName = object.displayName
  const isPending = updateMutation.isPending
  const isBusy = isPending || isLoading
  const metadataErrorMessage = metaError?.message ?? ""

  return (
    <Modal
      title={t`Schedule Deletion`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Saving...` : t`Save`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isBusy || !hasChanges}
    >
      {isLoading ? (
        <Status status="progress" title={t`Loading Object Properties...`} className="mt-0" />
      ) : isMetaError ? (
        <Status status="error" title={t`Failed to Load Object Metadata`} body={metadataErrorMessage} className="mt-0" />
      ) : (
        <Stack direction="vertical" gap="4" className={isPickerOpen ? "min-h-150" : ""}>
          <p className="text-theme-default">
            <Trans>Schedule automatic deletion of this object by setting an expiry date and time.</Trans>
          </p>
          <DescriptionList>
            <DescriptionTerm>
              <Trans>Name</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>{displayName}</DescriptionDefinition>
            <DescriptionTerm>
              <Trans>Content type</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>{metadataRaw?.contentType ?? "- -"}</DescriptionDefinition>
            <DescriptionTerm>
              <Trans>MD5 checksum</Trans>
            </DescriptionTerm>
            <DescriptionDefinition className="break-all">{metadataRaw?.etag ?? "- -"}</DescriptionDefinition>
            <DescriptionTerm>
              <Trans>Size</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>
              {metadataRaw?.contentLength != null ? formatBytesBinary(metadataRaw.contentLength) : "- -"}
            </DescriptionDefinition>
            <DescriptionTerm>
              <Trans>Last modified</Trans>
            </DescriptionTerm>
            <DescriptionDefinition>
              {metadataRaw?.lastModified
                ? formatDate(metadataRaw.lastModified)
                : object.last_modified
                  ? formatDate(object.last_modified)
                  : "- -"}
            </DescriptionDefinition>
          </DescriptionList>

          <DateTimePicker
            label={t`Expires at`}
            helptext={t`When set, the object is automatically deleted at this date and time. Clear the field to remove an existing expiry.`}
            enableTime
            enableSeconds
            time_24hr
            value={expiresAt || undefined}
            onChange={(dates) => setExpiresAt(dates?.[0] ? dates[0].toISOString() : "")}
            onClear={() => setExpiresAt("")}
            onOpen={() => setIsPickerOpen(true)}
            onClose={() => setIsPickerOpen(false)}
            disabled={isBusy}
          />
        </Stack>
      )}
    </Modal>
  )
}

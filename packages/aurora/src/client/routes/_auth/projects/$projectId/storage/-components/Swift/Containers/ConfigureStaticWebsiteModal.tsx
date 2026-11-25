import React, { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  TextInput,
  Stack,
  Status,
  Checkbox,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Icon,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { useProjectId } from "@/client/hooks/useProjectId"

interface ConfigureStaticWebsiteModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const ConfigureStaticWebsiteModal = ({
  isOpen,
  container,
  onClose,
  onSuccess,
  onError,
}: ConfigureStaticWebsiteModalProps) => {
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

  const isPublicAccess = info?.read === ".r:*,.rlistings"

  const { data: publicUrl } = trpcReact.storage.swift.getContainerPublicUrl.useQuery(
    { project_id: projectId, container: container?.name ?? "" },
    { enabled: isOpen && container !== null && isPublicAccess }
  )

  const utils = trpcReact.useUtils()

  const [webIndex, setWebIndex] = useState("")
  const [webListings, setWebListings] = useState(false)

  useEffect(() => {
    if (!info) return
    setWebIndex(info.metadata?.["web-index"] ?? "")
    setWebListings(info.metadata?.["web-listings"] === "1" || info.metadata?.["web-listings"] === "true")
  }, [info])

  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  const resetForm = () => {
    setWebIndex("")
    setWebListings(false)
    updateMutation.reset()
  }

  const updateMutation = trpcReact.storage.swift.updateContainerMetadata.useMutation({
    onSuccess: () => {
      utils.storage.swift.getContainerMetadata.invalidate({ container: container!.name })
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
    const metadataToSet: Record<string, string> = {}
    const removeMetadata: string[] = []

    if (webIndex) {
      metadataToSet["web-index"] = webIndex
    } else if (info?.metadata?.["web-index"]) {
      removeMetadata.push("web-index")
    }
    if (webListings) {
      metadataToSet["web-listings"] = "1"
    } else if (info?.metadata?.["web-listings"]) {
      removeMetadata.push("web-listings")
    }

    updateMutation.mutate({
      project_id: projectId,
      container: container.name,
      metadata: Object.keys(metadataToSet).length ? metadataToSet : undefined,
      removeMetadata: removeMetadata.length ? removeMetadata : undefined,
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen || !container) return null

  const containerName = container.name
  const isBusy = isLoading || updateMutation.isPending

  const initialWebIndex = info?.metadata?.["web-index"] ?? ""
  const initialWebListings = info?.metadata?.["web-listings"] === "1" || info?.metadata?.["web-listings"] === "true"
  const isUnchanged = webIndex === initialWebIndex && webListings === initialWebListings

  return (
    <Modal
      title={t`Configure Static Website`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={updateMutation.isPending ? t`Saving...` : t`Save`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isBusy || isUnchanged}
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
              Serve objects in container <strong>{containerName}</strong> as a static website.
            </Trans>
          </p>

          {isPublicAccess ? (
            <Stack direction="vertical" gap="4">
              {publicUrl && (
                <div>
                  <p className="text-theme-default mb-1 text-sm font-semibold">
                    <Trans>URL for public access</Trans>{" "}
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-info text-xs font-normal underline"
                    >
                      <Trans>Open in new tab</Trans>
                    </a>
                  </p>
                  <TextInput value={publicUrl} disabled readOnly />
                </div>
              )}

              <Stack direction="vertical" gap="1">
                <Checkbox
                  label={t`Serve objects as index when file name is:`}
                  checked={!!webIndex}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (!e.target.checked) setWebIndex("")
                    else if (!webIndex) setWebIndex("index.html")
                  }}
                  disabled={isBusy}
                />
                <div className="pl-6">
                  <TextInput
                    value={webIndex}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebIndex(e.target.value)}
                    placeholder="index.html"
                    disabled={isBusy || !webIndex}
                    className="flex-1"
                  />
                </div>
              </Stack>

              <Stack direction="horizontal" alignment="start" gap="2">
                <Checkbox
                  label={t`Enable file listing`}
                  checked={webListings}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebListings(e.target.checked)}
                  disabled={isBusy}
                />
                <Tooltip triggerEvent="hover">
                  <TooltipTrigger>
                    <Icon icon="help" size="16" className="text-theme-light cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="z-10 max-w-55">
                    <Trans>If there is no index file, the URL displays a list of objects in the container.</Trans>
                  </TooltipContent>
                </Tooltip>
              </Stack>
            </Stack>
          ) : (
            <p className="text-theme-default text-sm">
              <Trans>
                Public read access is not enabled. Before configuring static website serving, go to{" "}
                <strong>Manage Access</strong> and enable public read access.
              </Trans>
            </p>
          )}
        </Stack>
      )}
    </Modal>
  )
}

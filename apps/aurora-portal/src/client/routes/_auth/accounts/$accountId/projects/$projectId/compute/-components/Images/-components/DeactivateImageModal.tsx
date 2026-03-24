import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import {
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Icon,
  Modal,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { SizeDisplay } from "./SizeDisplay"

interface DeactivateImageModalProps {
  image: GlanceImage
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onDeactivate: (image: GlanceImage) => void
}

export const DeactivateImageModal: React.FC<DeactivateImageModalProps> = ({
  image,
  isOpen,
  isLoading,
  onClose,
  onDeactivate,
}) => {
  if (!image) return null

  const { t } = useLingui()

  const handleDeactivate = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDeactivate(image)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={t`Deactivate Image`}
      open={isOpen}
      onConfirm={(e) => {
        handleDeactivate(e)
        onClose()
      }}
      confirmButtonLabel={t`Deactivate`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isLoading}
    >
      {isLoading && (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      )}
      {!isLoading && (
        <div>
          <p className="mb-6">
            <Trans>
              Deactivating this image will prevent it from being used to launch new instances. Existing instances will
              not be affected.
            </Trans>
          </p>

          {image && (
            <DataGrid columns={2}>
              <DataGridRow>
                <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
                <DataGridCell>{image.name || t`Unnamed`}</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`Id`}</DataGridHeadCell>
                <DataGridCell>{image.id}</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
                <DataGridCell>{image.status}</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`Visibility`}</DataGridHeadCell>
                <DataGridCell>{image.visibility}</DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`Size`}</DataGridHeadCell>
                <DataGridCell>
                  <SizeDisplay size={image.size} />
                </DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`Disk Format`}</DataGridHeadCell>
                <DataGridCell>{image.disk_format || t`N/A`}</DataGridCell>
              </DataGridRow>
              {image.os_type && (
                <DataGridRow>
                  <DataGridHeadCell>{t`OS Type`}</DataGridHeadCell>
                  <DataGridCell className="flex items-center space-x-2">
                    <Icon icon={"info"} color="jn-text-theme-info" />
                    <span>{image.os_type}</span>
                  </DataGridCell>
                  {image.os_distro && <span className="text-xs text-gray-400">({image.os_distro})</span>}
                </DataGridRow>
              )}
              <DataGridRow>
                <DataGridHeadCell>{t`Created`}</DataGridHeadCell>
                <DataGridCell>
                  {image.created_at ? new Date(image.created_at).toLocaleDateString() : t`N/A`}
                </DataGridCell>
              </DataGridRow>
            </DataGrid>
          )}
        </div>
      )}
    </Modal>
  )
}

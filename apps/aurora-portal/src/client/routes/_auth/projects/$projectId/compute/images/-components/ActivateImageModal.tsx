import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import {
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Modal,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { SizeDisplay } from "./SizeDisplay"

interface ActivateImageModalProps {
  image: GlanceImage
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onActivate: (image: GlanceImage) => void
}

export const ActivateImageModal: React.FC<ActivateImageModalProps> = ({
  image,
  isOpen,
  isLoading,
  onClose,
  onActivate,
}) => {
  if (!image) return null

  const { t } = useLingui()

  const handleActivate = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onActivate(image)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={t`Activate Image`}
      open={isOpen}
      onConfirm={handleActivate}
      confirmButtonLabel={t`Activate`}
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
            <Trans>Activating this image will allow it to be used to launch new instances again.</Trans>
          </p>

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
            <DataGridRow>
              <DataGridHeadCell>{t`Created`}</DataGridHeadCell>
              <DataGridCell>
                {(() => {
                  const dt = new Date(image.created_at ?? "")
                  return !isNaN(dt.getTime()) ? dt.toLocaleDateString() : t`N/A`
                })()}
              </DataGridCell>
            </DataGridRow>
          </DataGrid>
        </div>
      )}
    </Modal>
  )
}

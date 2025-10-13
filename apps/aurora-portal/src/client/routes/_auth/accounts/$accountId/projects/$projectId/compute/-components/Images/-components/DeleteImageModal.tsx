import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import {
  Button,
  ButtonRow,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Icon,
  Message,
  Modal,
  ModalFooter,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { StatusBadge } from "./StatusBadge"
import { VisibilityBadge } from "./VisibilityBadge"
import { SizeDisplay } from "./SizeDisplay"
interface DeleteImageModalProps {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  image: GlanceImage
  onDelete: (updatedImage: GlanceImage) => void
}

export const DeleteImageModal: React.FC<DeleteImageModalProps> = ({ isOpen, isLoading, onClose, image, onDelete }) => {
  if (!image) return null

  const { t } = useLingui()

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDelete(image)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title="Delete Image"
      open={isOpen}
      modalFooter={
        <ModalFooter className="flex justify-end ">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={(e) => {
                handleDelete(e)
                onClose()
              }}
              disabled={isLoading}
              data-testid={`delete-image-button`}
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Delete</Trans>}
            </Button>
            <Button variant="default" onClick={onClose}>
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
          <Message
            text={t`This action cannot be undone. The image will be permanently deleted.`}
            variant="warning"
            className="mb-4"
          />

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
                <DataGridCell>
                  <StatusBadge status={image.status} />
                </DataGridCell>
              </DataGridRow>
              <DataGridRow>
                <DataGridHeadCell>{t`Visibility`}</DataGridHeadCell>
                <DataGridCell>
                  <VisibilityBadge visibility={image.visibility} />
                </DataGridCell>
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
                  {image.created_at ? new Date(image.created_at).toLocaleDateString() : "N/A"}
                </DataGridCell>
              </DataGridRow>
            </DataGrid>
          )}
        </div>
      )}
    </Modal>
  )
}

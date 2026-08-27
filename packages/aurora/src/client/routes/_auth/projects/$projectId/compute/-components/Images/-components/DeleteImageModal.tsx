import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import {
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
  Modal,
  Stack,
  TextInput,
} from "@cloudoperators/juno-ui-components"
import { SizeDisplay } from "./SizeDisplay"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

interface DeleteImageModalProps {
  image: GlanceImage
  isOpen: boolean
  isLoading: boolean
  isDisabled: boolean
  onClose: () => void
  onDelete: (updatedImage: GlanceImage) => void
}

export const DeleteImageModal: React.FC<DeleteImageModalProps> = ({
  image,
  isOpen,
  isLoading,
  isDisabled,
  onClose,
  onDelete,
}) => {
  if (!image) return null

  const { t } = useLingui()

  const { confirmText, setConfirmText, isConfirmed, trackClose } = useDeleteConfirmation({
    isOpen,
    confirmWord: "delete",
    trackingPrefix: "compute.image",
  })

  const handleClose = () => {
    trackClose()
    onClose()
  }

  const handleConfirm = () => {
    onDelete(image)
    handleClose()
  }

  const confirmLabel = isLoading ? t`Deleting...` : t`Delete Image`
  const imageName = image?.name || image?.id

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="small"
      title={t`Delete Image "${imageName}"`}
      confirmButtonLabel={confirmLabel}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmed || isLoading || isDisabled}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        <p className="text-theme-default">
          <Trans>This action cannot be undone. The image will be permanently deleted.</Trans>
        </p>

        {image && (
          <DescriptionList>
            <DescriptionTerm>{t`Name`}</DescriptionTerm>
            <DescriptionDefinition>{image.name || t`Unnamed`}</DescriptionDefinition>

            <DescriptionTerm>{t`Id`}</DescriptionTerm>
            <DescriptionDefinition>{image.id}</DescriptionDefinition>
            <DescriptionTerm>{t`Status`}</DescriptionTerm>
            <DescriptionDefinition>{image.status}</DescriptionDefinition>
            <DescriptionTerm>{t`Visibility`}</DescriptionTerm>
            <DescriptionDefinition>{image.visibility}</DescriptionDefinition>
            <DescriptionTerm>{t`Size`}</DescriptionTerm>
            <DescriptionDefinition>
              <SizeDisplay size={image.size} />
            </DescriptionDefinition>
            <DescriptionTerm>{t`Disk Format`}</DescriptionTerm>
            <DescriptionDefinition>{image.disk_format || t`N/A`}</DescriptionDefinition>
            <DescriptionTerm>{t`Created`}</DescriptionTerm>
            <DescriptionDefinition>
              {image.created_at ? new Date(image.created_at).toLocaleDateString() : t`N/A`}
            </DescriptionDefinition>
          </DescriptionList>
        )}

        <TextInput
          label={t`Type "delete" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="delete"
          autoFocus
          disabled={isLoading}
        />
      </Stack>
    </Modal>
  )
}

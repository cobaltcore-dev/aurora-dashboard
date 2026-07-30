import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import {
  Button,
  ButtonRow,
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
  Message,
  Modal,
  ModalFooter,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { SizeDisplay } from "./SizeDisplay"

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

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDelete(image)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={t`Delete Image`}
      open={isOpen}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button variant="default" onClick={onClose}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary-danger"
              onClick={(e) => {
                handleDelete(e)
                onClose()
              }}
              disabled={isLoading || isDisabled}
              data-testid={`delete-image-button`}
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Delete</Trans>}
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
            variant="danger"
            className="mb-4"
          />

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
        </div>
      )}
    </Modal>
  )
}

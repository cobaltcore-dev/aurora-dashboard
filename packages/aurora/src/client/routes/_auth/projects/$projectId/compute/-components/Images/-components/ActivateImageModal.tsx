import React from "react"
import { useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import {
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
  Message,
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
          <Message
            text={t`Activating this image will allow it to be used to launch new instances again.`}
            variant="info"
            className="mb-4"
          />

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
              {(() => {
                const dt = new Date(image.created_at ?? "")
                return !isNaN(dt.getTime()) ? dt.toLocaleDateString() : t`N/A`
              })()}
            </DescriptionDefinition>
          </DescriptionList>
        </div>
      )}
    </Modal>
  )
}

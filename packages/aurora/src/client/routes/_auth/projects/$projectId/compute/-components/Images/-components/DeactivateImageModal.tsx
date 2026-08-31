import React from "react"
import { useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import {
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
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
      onConfirm={handleDeactivate}
      confirmButtonLabel={t`Deactivate`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isLoading}
    >
      {isLoading ? (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      ) : (
        <>
          <p className="mb-4">
            {t`Deactivating this image will prevent it from being used to launch new instances. Existing instances will not be affected.`}
          </p>

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
        </>
      )}
    </Modal>
  )
}

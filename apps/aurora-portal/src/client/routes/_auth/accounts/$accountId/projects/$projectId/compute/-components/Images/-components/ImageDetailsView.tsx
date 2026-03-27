import React from "react"
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Container,
  ContentHeading,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import { SizeDisplay } from "./SizeDisplay"

interface ImageDetailsViewProps {
  image: GlanceImage
}

export const GeneralImageData: React.FC<ImageDetailsViewProps> = ({ image }) => {
  const { t } = useLingui()

  return (
    <Container px={false} py>
      <ContentHeading>{t`General Image Data`}</ContentHeading>
      <DescriptionList alignTerms="right">
        <DescriptionTerm>{t`ID`}</DescriptionTerm>
        <DescriptionDefinition>{image.id}</DescriptionDefinition>

        <DescriptionTerm>{t`Name`}</DescriptionTerm>
        <DescriptionDefinition>{image.name}</DescriptionDefinition>

        <DescriptionTerm>{t`Status`}</DescriptionTerm>
        <DescriptionDefinition>{image.status}</DescriptionDefinition>

        <DescriptionTerm>{t`Size`}</DescriptionTerm>
        <DescriptionDefinition>
          <SizeDisplay size={image.size} />
        </DescriptionDefinition>

        <DescriptionTerm>{t`Min. Disk`}</DescriptionTerm>
        <DescriptionDefinition>{image.min_disk} GB</DescriptionDefinition>

        <DescriptionTerm>{t`Min. RAM`}</DescriptionTerm>
        <DescriptionDefinition>{image.min_ram} MB</DescriptionDefinition>

        <DescriptionTerm>{t`Disk Format`}</DescriptionTerm>
        <DescriptionDefinition>
          <span className="uppercase">{image.disk_format}</span>
        </DescriptionDefinition>

        <DescriptionTerm>{t`Container Format`}</DescriptionTerm>
        <DescriptionDefinition>
          <span className="uppercase">{image.container_format}</span>
        </DescriptionDefinition>

        <DescriptionTerm>{t`Created At`}</DescriptionTerm>
        <DescriptionDefinition>
          {image.created_at ? new Date(image.created_at).toLocaleDateString() : t`N/A`}
        </DescriptionDefinition>

        <DescriptionTerm>{t`Updated At`}</DescriptionTerm>
        <DescriptionDefinition>
          {image.updated_at ? new Date(image.updated_at).toLocaleDateString() : t`N/A`}
        </DescriptionDefinition>
      </DescriptionList>
    </Container>
  )
}

export const SecuritySection: React.FC<ImageDetailsViewProps> = ({ image }) => {
  const { t } = useLingui()

  return (
    <Container px={false} py>
      <ContentHeading>{t`Security`}</ContentHeading>
      <DescriptionList alignTerms="right">
        <DescriptionTerm>{t`Owner`}</DescriptionTerm>
        <DescriptionDefinition>{image.owner}</DescriptionDefinition>

        <DescriptionTerm>{t`Visibility`}</DescriptionTerm>
        <DescriptionDefinition>{image.visibility}</DescriptionDefinition>

        <DescriptionTerm>{t`Protected`}</DescriptionTerm>
        <DescriptionDefinition>{image.protected ? t`Yes` : t`No`}</DescriptionDefinition>

        <DescriptionTerm>{t`Checksum`}</DescriptionTerm>
        <DescriptionDefinition>{image?.checksum ? image.checksum : ""}</DescriptionDefinition>
      </DescriptionList>
    </Container>
  )
}

export const CustomPropertiesSection: React.FC<ImageDetailsViewProps> = ({ image }) => {
  const { t } = useLingui()

  // Define the known fields that should NOT be displayed as custom metadata
  const knownFields = new Set([
    "id",
    "name",
    "status",
    "visibility",
    "size",
    "disk_format",
    "container_format",
    "min_disk",
    "min_ram",
    "owner",
    "protected",
    "created_at",
    "updated_at",
    "checksum",
  ])

  // Extract all custom properties (anything not in knownFields)
  const customProperties = Object.entries(image)
    .filter(([key]) => !knownFields.has(key))
    .sort(([a], [b]) => a.localeCompare(b))

  const hasProperties = customProperties.length > 0

  return (
    <Container px={false} py>
      <ContentHeading>{t`Custom Properties / Metadata`}</ContentHeading>
      {hasProperties ? (
        <DescriptionList alignTerms="right">
          {customProperties.map(([key, value]) => (
            <React.Fragment key={key}>
              <DescriptionTerm>{key}</DescriptionTerm>
              <DescriptionDefinition>
                {value === null || value === undefined ? (
                  <span>null</span>
                ) : typeof value === "object" ? (
                  <span className="break-all">{JSON.stringify(value)}</span>
                ) : typeof value === "boolean" ? (
                  value ? (
                    t`True`
                  ) : (
                    t`False`
                  )
                ) : (
                  <span className="break-all">{String(value)}</span>
                )}
              </DescriptionDefinition>
            </React.Fragment>
          ))}
        </DescriptionList>
      ) : (
        <p className="text-theme-light">{t`No custom properties defined`}</p>
      )}
    </Container>
  )
}

// Example usage component
export const ImageDetailsView: React.FC<ImageDetailsViewProps> = ({ image }) => {
  return (
    <Stack direction="vertical" gap="6">
      <GeneralImageData image={image} />
      <SecuritySection image={image} />
      <CustomPropertiesSection image={image} />
    </Stack>
  )
}

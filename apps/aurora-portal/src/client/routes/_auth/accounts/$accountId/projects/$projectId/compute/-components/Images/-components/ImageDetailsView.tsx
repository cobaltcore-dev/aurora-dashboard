import React from "react"
import {
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  Container,
  DataGridRow,
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
      <DataGrid columns={2} gridColumnTemplate="38% auto">
        <DataGridRow>
          <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
          <DataGridCell>{image.id}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
          <DataGridCell>{image.name}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridCell>{image.status}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Size`}</DataGridHeadCell>
          <DataGridCell>
            <SizeDisplay size={image.size} />
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Min. Disk`}</DataGridHeadCell>
          <DataGridCell>{image.min_disk} GB</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Min. RAM`}</DataGridHeadCell>
          <DataGridCell>{image.min_ram} MB</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Disk Format`}</DataGridHeadCell>
          <DataGridCell>
            <span className="uppercase">{image.disk_format}</span>
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Container Format`}</DataGridHeadCell>
          <DataGridCell>
            <span className="uppercase">{image.container_format}</span>
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Created At`}</DataGridHeadCell>
          <DataGridCell>{image.created_at ? new Date(image.created_at).toLocaleDateString() : t`N/A`}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Updated At`}</DataGridHeadCell>
          <DataGridCell>{image.updated_at ? new Date(image.updated_at).toLocaleDateString() : t`N/A`}</DataGridCell>
        </DataGridRow>
      </DataGrid>
    </Container>
  )
}

export const SecuritySection: React.FC<ImageDetailsViewProps> = ({ image }) => {
  const { t } = useLingui()

  return (
    <Container px={false} py>
      <ContentHeading>{t`Security`}</ContentHeading>
      <DataGrid columns={2} gridColumnTemplate="38% auto">
        <DataGridRow>
          <DataGridHeadCell>{t`Owner`}</DataGridHeadCell>
          <DataGridCell>{image.owner}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Visibility`}</DataGridHeadCell>
          <DataGridCell>{image.visibility}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Protected`}</DataGridHeadCell>
          <DataGridCell>{image.protected ? t`Yes` : t`No`}</DataGridCell>
        </DataGridRow>
        {image.checksum && (
          <DataGridRow>
            <DataGridHeadCell>{t`Checksum`}</DataGridHeadCell>
            <DataGridCell>{image.checksum}</DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
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
        <DataGrid columns={2} gridColumnTemplate="38% auto">
          {customProperties.map(([key, value]) => (
            <DataGridRow key={key}>
              <DataGridHeadCell>{key}</DataGridHeadCell>
              <DataGridCell>
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
              </DataGridCell>
            </DataGridRow>
          ))}
        </DataGrid>
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

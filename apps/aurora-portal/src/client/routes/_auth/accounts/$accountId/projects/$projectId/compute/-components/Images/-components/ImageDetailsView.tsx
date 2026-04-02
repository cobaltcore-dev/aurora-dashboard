import React, { useState } from "react"
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Container,
  ContentHeading,
  Stack,
  Badge,
  BadgeVariantType,
  Spinner,
  Message,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { GlanceImage } from "@/server/Compute/types/image"
import { SizeDisplay } from "./SizeDisplay"
import { trpcReact } from "@/client/trpcClient"
import { MEMBER_STATUSES } from "../../../-constants/filters"
import { ImageMembersTable } from "./ImageMembersTable"

interface ImageDetailsViewProps {
  image: GlanceImage
  currentProjectId?: string
  permissions?: {
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }
}

export const GeneralImageData: React.FC<{ image: GlanceImage }> = ({ image }) => {
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

export const SecuritySection: React.FC<{ image: GlanceImage; currentProjectId?: string }> = ({
  image,
  currentProjectId,
}) => {
  const { t } = useLingui()

  const isSharedWithMe = image.visibility === "shared" && image.owner !== undefined && image.owner !== currentProjectId

  return (
    <Container px={false} py>
      <ContentHeading>{t`Security`}</ContentHeading>
      <DescriptionList alignTerms="right">
        <DescriptionTerm>{isSharedWithMe ? t`Shared by Project` : t`Owner Project ID`}</DescriptionTerm>
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

function getStatusBadgeVariant(status: string): BadgeVariantType {
  switch (status) {
    case MEMBER_STATUSES.PENDING:
      return "warning"
    case MEMBER_STATUSES.ACCEPTED:
      return "success"
    case MEMBER_STATUSES.REJECTED:
      return "danger"
    default:
      return "default"
  }
}

const MemberAccessSection: React.FC<{
  image: GlanceImage
  memberId: string
}> = ({ image, memberId }) => {
  const { t } = useLingui()

  const { data: memberData, isLoading } = trpcReact.compute.getImageMember.useQuery(
    { imageId: image.id, memberId },
    { enabled: !!image.id && !!memberId }
  )

  if (isLoading) {
    return (
      <Stack distribution="center" alignment="center" className="py-4">
        <Spinner variant="primary" />
      </Stack>
    )
  }

  if (!memberData) {
    return null
  }

  return (
    <Stack direction="vertical" gap="4">
      <DescriptionList alignTerms="right">
        <DescriptionTerm>{t`Access Status`}</DescriptionTerm>
        <DescriptionDefinition>
          <div>
            <Badge text={memberData.status} variant={getStatusBadgeVariant(memberData.status)} />
          </div>
        </DescriptionDefinition>

        <DescriptionTerm>{t`Shared Since`}</DescriptionTerm>
        <DescriptionDefinition>
          {memberData.created_at ? new Date(memberData.created_at).toLocaleString() : ""}
        </DescriptionDefinition>

        <DescriptionTerm>{t`Last Updated`}</DescriptionTerm>
        <DescriptionDefinition>
          {memberData.updated_at ? new Date(memberData.updated_at).toLocaleString() : ""}
        </DescriptionDefinition>
      </DescriptionList>
    </Stack>
  )
}

const SharingSection: React.FC<ImageDetailsViewProps> = ({ image, currentProjectId, permissions }) => {
  const { t } = useLingui()
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null)

  const isImageOwner = image.owner === currentProjectId
  const isShared = image.visibility === "shared"

  const { data: imageMembers, isLoading: isMembersLoading } = trpcReact.compute.listImageMembers.useQuery(
    { imageId: image.id },
    { enabled: isShared && isImageOwner && !!image.id }
  )

  if (!isShared) return null

  return (
    <Container px={false} py>
      <ContentHeading>{t`Sharing`}</ContentHeading>

      {message && (
        <Message text={message.text} variant={message.type} onDismiss={() => setMessage(null)} className="mb-4" />
      )}

      {isImageOwner ? (
        <ImageMembersTable
          image={image}
          imageMembers={imageMembers}
          isMembersLoading={isMembersLoading}
          canAdd={permissions?.canCreateMember ?? false}
          canRemove={permissions?.canDeleteMember ?? false}
          isAddingMember={isAddingMember}
          setIsAddingMember={setIsAddingMember}
          setMessage={setMessage}
        />
      ) : (
        currentProjectId && <MemberAccessSection image={image} memberId={currentProjectId} />
      )}
    </Container>
  )
}

export const CustomPropertiesSection: React.FC<{ image: GlanceImage }> = ({ image }) => {
  const { t } = useLingui()

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

  const customProperties = Object.entries(image)
    .filter(([key]) => !knownFields.has(key))
    .sort(([a], [b]) => a.localeCompare(b))

  const hasProperties = customProperties.length > 0

  return (
    <Container px={false} py>
      <ContentHeading>{t`Custom Properties / Metadata`}</ContentHeading>
      {hasProperties ? (
        <DescriptionList alignTerms="right" className="grid-cols-4">
          {customProperties.map(([key, value]) => (
            <React.Fragment key={key}>
              <DescriptionTerm className="col-span-1">{key}</DescriptionTerm>
              <DescriptionDefinition className="col-span-1">
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

export const ImageDetailsView: React.FC<ImageDetailsViewProps> = ({ image, currentProjectId, permissions }) => {
  return (
    <Stack direction="vertical" gap="6">
      <GeneralImageData image={image} />
      <SecuritySection image={image} currentProjectId={currentProjectId} />
      <CustomPropertiesSection image={image} />
      <SharingSection image={image} currentProjectId={currentProjectId} permissions={permissions} />
    </Stack>
  )
}

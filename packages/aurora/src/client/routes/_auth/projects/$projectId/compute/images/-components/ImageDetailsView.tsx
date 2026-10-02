import React from "react"
import { Container, Stack, Button, ButtonRow, Box } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { GlanceImage, ImageMember, MemberStatus } from "@/server/Compute/types/image"
import { SizeDisplay } from "./SizeDisplay"
import { MEMBER_STATUSES } from "../../-constants/filters"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"

interface ImageDetailsViewProps {
  image: GlanceImage
  isSharedWithMe?: boolean
  permissions?: {
    canCreateMember: boolean
    canDeleteMember: boolean
    canUpdateMember: boolean
  }
  myMemberData?: ImageMember
  onMemberStatusChange?: (status: MemberStatus) => void
  isMemberStatusChanging?: boolean
  actions?: React.ReactNode
}

const SharedImageBox: React.FC<{
  image: GlanceImage
  myMemberData: ImageMember
  canUpdateMember: boolean
  onStatusChange: (status: MemberStatus) => void
  isLoading: boolean
}> = ({ image, myMemberData, canUpdateMember, onStatusChange, isLoading }) => {
  const { t } = useLingui()
  const isPending = myMemberData.status === MEMBER_STATUSES.PENDING
  const isRejected = myMemberData.status === MEMBER_STATUSES.REJECTED

  const sharedAt = myMemberData.created_at ? new Date(myMemberData.created_at).toLocaleString() : t`N/A`
  const updatedAt = myMemberData.updated_at ? new Date(myMemberData.updated_at).toLocaleString() : t`N/A`
  const ownerProject = image.owner ?? ""

  return (
    <Box>
      {isPending && (
        <p className="text-theme-highest font-semibold">
          <Trans>Your action is required</Trans>
        </p>
      )}
      <p>
        <Trans>
          This image was shared with you by <span className="font-semibold">{ownerProject}</span> on {sharedAt}.
        </Trans>
      </p>
      <ul>
        <li>
          <span className="font-semibold">
            <Trans>Access Status:</Trans>
          </span>{" "}
          {myMemberData.status}
        </li>
        <li>
          <span className="font-semibold">
            <Trans>Shared:</Trans>
          </span>{" "}
          {sharedAt}
        </li>
        <li>
          <span className="font-semibold">
            <Trans>Updated:</Trans>
          </span>{" "}
          {updatedAt}
        </li>
      </ul>

      {canUpdateMember && (isPending || isRejected || myMemberData.status === MEMBER_STATUSES.ACCEPTED) && (
        <ButtonRow>
          {(isPending || isRejected) && (
            <Button onClick={() => onStatusChange(MEMBER_STATUSES.ACCEPTED)} disabled={isLoading}>
              <Trans>Accept</Trans>
            </Button>
          )}
          {(isPending || myMemberData.status === MEMBER_STATUSES.ACCEPTED) && (
            <Button onClick={() => onStatusChange(MEMBER_STATUSES.REJECTED)} disabled={isLoading}>
              <Trans>Reject</Trans>
            </Button>
          )}
        </ButtonRow>
      )}
    </Box>
  )
}

export const GeneralImageData: React.FC<{ image: GlanceImage }> = ({ image }) => {
  const { t } = useLingui()
  const items = [
    { label: t`ID`, value: <ClipboardText text={image.id} /> },
    { label: t`Name`, value: image.name },
    { label: t`Status`, value: image.status },
    { label: t`Size`, value: <SizeDisplay size={image.size} /> },
    { label: t`Min. Disk`, value: `${image.min_disk} GB` },
    { label: t`Min. RAM`, value: `${image.min_ram} MB` },
    { label: t`Disk Format`, value: <span className="uppercase">{image.disk_format}</span> },
    { label: t`Container Format`, value: <span className="uppercase">{image.container_format}</span> },
    {
      label: t`Created At`,
      value: image.created_at ? new Date(image.created_at).toLocaleDateString() : t`N/A`,
    },
    {
      label: t`Updated At`,
      value: image.updated_at ? new Date(image.updated_at).toLocaleDateString() : t`N/A`,
    },
  ]

  return (
    <Container px={false} py>
      <h2>{t`General Image Data`}</h2>
      <TwoColumnDescriptionList items={items} />
    </Container>
  )
}

export const SecuritySection: React.FC<{ image: GlanceImage; isSharedWithMe?: boolean }> = ({
  image,
  isSharedWithMe = false,
}) => {
  const { t } = useLingui()

  const items = [
    {
      label: isSharedWithMe ? t`Shared by Project` : t`Owner Project ID`,
      value: image.owner ? <ClipboardText text={image.owner} /> : "",
    },
    { label: t`Visibility`, value: image.visibility },
    { label: t`Protected`, value: image.protected ? t`Yes` : t`No` },
    { label: t`Checksum`, value: image?.checksum ? image.checksum : "" },
  ]

  return (
    <Container px={false} py>
      <h2>{t`Security`}</h2>
      <TwoColumnDescriptionList items={items} />
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

  const items = customProperties.map(([key, value]) => ({
    label: key,
    value:
      value === null || value === undefined ? (
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
      ),
  }))

  return (
    <Container px={false} py>
      <h2>{t`Metadata`}</h2>
      {hasProperties ? (
        <TwoColumnDescriptionList items={items} />
      ) : (
        <p className="text-theme-light">{t`No custom properties defined`}</p>
      )}
    </Container>
  )
}

export const ImageDetailsView: React.FC<ImageDetailsViewProps> = ({
  image,
  isSharedWithMe = false,
  permissions,
  myMemberData,
  onMemberStatusChange,
  isMemberStatusChanging,
  actions,
}) => {
  return (
    <Stack direction="vertical" gap="6">
      {isSharedWithMe && myMemberData && onMemberStatusChange && (
        <SharedImageBox
          image={image}
          myMemberData={myMemberData}
          canUpdateMember={permissions?.canUpdateMember ?? false}
          onStatusChange={onMemberStatusChange}
          isLoading={isMemberStatusChanging ?? false}
        />
      )}

      {actions}
      <GeneralImageData image={image} />
      <SecuritySection image={image} isSharedWithMe={isSharedWithMe} />
      <CustomPropertiesSection image={image} />
    </Stack>
  )
}

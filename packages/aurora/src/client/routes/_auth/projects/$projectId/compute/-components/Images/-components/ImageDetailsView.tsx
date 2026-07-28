import React, { useState } from "react"
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Container,
  ContentHeading,
  Stack,
  Message,
  Box,
  Button,
  ButtonRow,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { GlanceImage, ImageMember, MemberStatus } from "@/server/Compute/types/image"
import { SizeDisplay } from "./SizeDisplay"
import { trpcReact } from "@/client/trpcClient"
import { MEMBER_STATUSES } from "../../../-constants/filters"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { ImageMembersTable } from "./ImageMembersTable"

interface ImageDetailsViewProps {
  image: GlanceImage
  currentProjectId?: string
  activeTab?: "details" | "sharing"
  onTabChange?: (tab: "details" | "sharing") => void
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

      {canUpdateMember && (isPending || isRejected) && (
        <ButtonRow>
          <Button onClick={() => onStatusChange(MEMBER_STATUSES.ACCEPTED)} disabled={isLoading}>
            <Trans>Accept</Trans>
          </Button>
          {isPending && (
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
      <ContentHeading>{t`General Image Data`}</ContentHeading>
      <TwoColumnDescriptionList items={items} />
    </Container>
  )
}

export const SecuritySection: React.FC<{ image: GlanceImage; currentProjectId?: string }> = ({
  image,
  currentProjectId,
}) => {
  const { t } = useLingui()

  const isSharedWithMe = image.visibility === "shared" && image.owner !== undefined && image.owner !== currentProjectId
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
      <ContentHeading>{t`Security`}</ContentHeading>
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

const getTabClassName = (active: boolean) => {
  const base = "px-6 py-3 font-semibold border-b-2 transition-colors"
  return active
    ? `${base} border-theme-accent text-theme-highest`
    : `${base} border-transparent text-theme-secondary hover:text-theme-high`
}

const SharingDetailsTab: React.FC<ImageDetailsViewProps> = ({ image, permissions, currentProjectId }) => {
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null)

  const { data: imageMembers, isLoading: isMembersLoading } = trpcReact.compute.listImageMembers.useQuery(
    { project_id: currentProjectId!, imageId: image.id },
    { enabled: !!image.id && !!currentProjectId }
  )

  return (
    <Container px={false} py>
      {message && (
        <Message text={message.text} variant={message.type} onDismiss={() => setMessage(null)} className="mb-4" />
      )}
      <ImageMembersTable
        image={image}
        imageMembers={imageMembers}
        isMembersLoading={isMembersLoading}
        canAdd={permissions?.canCreateMember ?? false}
        canRemove={permissions?.canDeleteMember ?? false}
        isAddingMember={isAddingMember}
        setIsAddingMember={setIsAddingMember}
        setMessage={setMessage}
        projectId={currentProjectId!}
      />
    </Container>
  )
}

export const ImageDetailsView: React.FC<ImageDetailsViewProps> = ({
  image,
  currentProjectId,
  activeTab = "details",
  onTabChange,
  permissions,
  myMemberData,
  onMemberStatusChange,
  isMemberStatusChanging,
  actions,
}) => {
  const { t } = useLingui()

  const isSharedWithMe = image.visibility === "shared" && image.owner !== undefined && image.owner !== currentProjectId
  const isImageOwner = image.owner === currentProjectId
  const showTabs = isImageOwner && image.visibility === "shared"

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

      {showTabs && (
        <div className="border-theme-background-lvl-3 border-b">
          <Stack direction="horizontal" gap="0">
            <button className={getTabClassName(activeTab === "details")} onClick={() => onTabChange?.("details")}>
              {t`Details`}
            </button>
            <button className={getTabClassName(activeTab === "sharing")} onClick={() => onTabChange?.("sharing")}>
              {t`Sharing Details`}
            </button>
          </Stack>
        </div>
      )}

      {(activeTab === "details" || !showTabs) && (
        <>
          {actions}
          <GeneralImageData image={image} />
          <SecuritySection image={image} currentProjectId={currentProjectId} />
          <CustomPropertiesSection image={image} />
        </>
      )}

      {activeTab === "sharing" && showTabs && <SharingDetailsTab image={image} permissions={permissions} />}
    </Stack>
  )
}

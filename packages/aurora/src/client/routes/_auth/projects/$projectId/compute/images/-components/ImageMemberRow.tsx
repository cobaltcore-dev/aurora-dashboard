import React from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { MEMBER_STATUSES } from "../../-constants/filters"

interface ImageMember {
  image_id: string
  member_id: string
  status: string
  created_at: string
  updated_at: string
}

interface ImageMemberRowProps {
  member: ImageMember
  isDeleting: boolean
  onDelete: () => void
  canDelete: boolean
}

export const ImageMemberRow: React.FC<ImageMemberRowProps> = ({ member, isDeleting, onDelete, canDelete }) => {
  const { t } = useLingui()

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case MEMBER_STATUSES.PENDING:
        return t`Pending`
      case MEMBER_STATUSES.ACCEPTED:
        return t`Accepted`
      case MEMBER_STATUSES.REJECTED:
        return t`Rejected`
      default:
        return status
    }
  }

  const deleteButton = () => {
    if (!canDelete) {
      return <></>
    }

    const memberIdDisplay = member.member_id

    return (
      <Button
        icon="deleteForever"
        onClick={onDelete}
        title={t`Remove access for ${memberIdDisplay}`}
        aria-label={t`Remove access for ${memberIdDisplay}`}
        data-testid={`remove-${memberIdDisplay}`}
        disabled={isDeleting}
      />
    )
  }

  return (
    <DataGridRow>
      <DataGridCell className="break-all">{getStatusLabel(member.status)}</DataGridCell>
      <DataGridCell className="break-all">{member.member_id}</DataGridCell>
      <DataGridCell className="break-all">{member.image_id}</DataGridCell>
      <DataGridCell>
        {isDeleting ? (
          <Stack distribution="center" alignment="center">
            <Spinner variant="primary" />
          </Stack>
        ) : (
          <Stack distribution="end" alignment="end">
            {deleteButton()}
          </Stack>
        )}
      </DataGridCell>
    </DataGridRow>
  )
}

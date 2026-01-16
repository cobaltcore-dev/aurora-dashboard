import React, { useState, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { MEMBER_STATUSES } from "../../../-constants/filters"

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
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (confirm) {
      const timer = setTimeout(() => {
        setConfirm(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [confirm])

  const handleConfirmDelete = () => {
    setConfirm(false)
    onDelete()
  }

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

  // const getStatusVariant = (status: string): string => {
  //   switch (status) {
  //     case MEMBER_STATUSES.PENDING:
  //       return "warning"
  //     case MEMBER_STATUSES.ACCEPTED:
  //       return "default"
  //     case MEMBER_STATUSES.REJECTED:
  //       return "danger"
  //     default:
  //       return "default"
  //   }
  // }

  const deleteButton = () => {
    if (!canDelete) {
      return <></>
    }

    if (confirm) {
      return (
        <Button
          variant="primary-danger"
          onClick={handleConfirmDelete}
          title={t`Remove member access`}
          aria-label={t`Remove member access`}
          data-testid="confirm-removal"
          disabled={isDeleting}
        >
          {t`Remove`}
        </Button>
      )
    } else {
      const memberIdDisplay = member.member_id

      return (
        <Button
          icon="deleteForever"
          onClick={() => setConfirm(true)}
          title={t`Remove access for ${memberIdDisplay}`}
          aria-label={t`Remove access for ${memberIdDisplay}`}
          data-testid={`remove-${memberIdDisplay}`}
          disabled={isDeleting}
        />
      )
    }
  }

  return (
    <DataGridRow>
      <DataGridCell className="break-all">{member.image_id}</DataGridCell>
      <DataGridCell className="break-all">{member.member_id}</DataGridCell>
      <DataGridCell className="break-all">{getStatusLabel(member.status)}</DataGridCell>
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

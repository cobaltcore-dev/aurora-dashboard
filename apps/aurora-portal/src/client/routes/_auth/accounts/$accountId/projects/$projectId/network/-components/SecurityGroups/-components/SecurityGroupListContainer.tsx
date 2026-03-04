import { useState, useEffect, useRef } from "react"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  Stack,
  Spinner,
  Button,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useParams } from "@tanstack/react-router"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { EditSecurityGroupModal } from "./-modals/EditSecurityGroupModal"
import { AccessControlModal } from "./-modals/AccessControlModal"
import { DeleteSecurityGroupDialog } from "./-modals/DeleteSecurityGroupDialog"
import { SecurityGroupTableRow, type SecurityGroupPermissions } from "./SecurityGroupTableRow"

interface SecurityGroupListContainerProps {
  securityGroups: SecurityGroup[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  permissions: SecurityGroupPermissions
  onCreateClick?: () => void
  onDeleteSecurityGroup?: (securityGroupId: string) => void
  isDeletingSecurityGroup?: boolean
  deleteError?: string | null
}

export const SecurityGroupListContainer = ({
  securityGroups,
  isLoading,
  isError,
  error,
  permissions,
  onCreateClick,
  onDeleteSecurityGroup,
  isDeletingSecurityGroup = false,
  deleteError = null,
}: SecurityGroupListContainerProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId } = useParams({ strict: false })
  const [selectedSecurityGroup, setSelectedSecurityGroup] = useState<SecurityGroup | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [accessControlModalOpen, setAccessControlModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const prevIsDeletingRef = useRef<boolean>(false)

  const handleEdit = (sg: SecurityGroup) => {
    setSelectedSecurityGroup(sg)
    setEditModalOpen(true)
  }

  const handleAccessControl = (sg: SecurityGroup) => {
    setSelectedSecurityGroup(sg)
    setAccessControlModalOpen(true)
  }

  const handleDelete = (sg: SecurityGroup) => {
    setSelectedSecurityGroup(sg)
    setDeleteDialogOpen(true)
  }

  const handleViewDetails = (sg: SecurityGroup) => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/securitygroups/$securityGroupId",
      params: { accountId: accountId!, projectId: projectId!, securityGroupId: sg.id },
    })
  }

  const closeEditModal = () => {
    setSelectedSecurityGroup(null)
    setEditModalOpen(false)
  }

  const closeAccessControlModal = () => {
    setSelectedSecurityGroup(null)
    setAccessControlModalOpen(false)
  }

  const closeDeleteDialog = () => {
    setSelectedSecurityGroup(null)
    setDeleteDialogOpen(false)
  }

  // Close delete dialog when deletion completes successfully
  useEffect(() => {
    // Check if deletion just finished (was deleting before, now not deleting)
    const deletionJustFinished = prevIsDeletingRef.current && !isDeletingSecurityGroup

    // Close dialog if deletion just finished and there's no error
    if (deletionJustFinished && deleteDialogOpen && !deleteError) {
      closeDeleteDialog()
    }

    // Update the ref for next render
    prevIsDeletingRef.current = isDeletingSecurityGroup
  }, [isDeletingSecurityGroup, deleteError, deleteDialogOpen])

  // Loading state
  if (isLoading) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading...</Trans>
      </Stack>
    )
  }

  // Error state
  if (isError) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        {error?.message ?? t`Failed to load security groups`}
      </Stack>
    )
  }

  // Empty state
  if (securityGroups.length === 0) {
    return (
      <DataGrid columns={7} data-testid="no-security-groups">
        <DataGridRow>
          <DataGridCell colSpan={7}>
            <ContentHeading>
              <Trans>No security groups found</Trans>
            </ContentHeading>
            <p>
              <Trans>
                There are no security groups available for this project. Security groups define firewall rules for
                instances.
              </Trans>
            </p>
            {permissions.canCreate && onCreateClick && (
              <Button onClick={onCreateClick} variant="primary" className="mt-4">
                <Trans>Create Security Group</Trans>
              </Button>
            )}
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <>
      <DataGrid columns={5}>
        <DataGridRow>
          {[t`Name`, t`Description`, t`Shared`, t`Stateful`, ""].map((label) => (
            <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
          ))}
        </DataGridRow>
        {securityGroups.map((sg) => {
          return (
            <SecurityGroupTableRow
              key={sg.id}
              securityGroup={sg}
              permissions={permissions}
              onEdit={handleEdit}
              onAccessControl={handleAccessControl}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          )
        })}
      </DataGrid>

      {selectedSecurityGroup && (
        <>
          <EditSecurityGroupModal securityGroup={selectedSecurityGroup} open={editModalOpen} onClose={closeEditModal} />
          <AccessControlModal
            securityGroup={selectedSecurityGroup}
            open={accessControlModalOpen}
            onClose={closeAccessControlModal}
          />
          <DeleteSecurityGroupDialog
            securityGroup={selectedSecurityGroup}
            isOpen={deleteDialogOpen}
            onClose={closeDeleteDialog}
            onDelete={(id) => {
              if (onDeleteSecurityGroup) {
                onDeleteSecurityGroup(id)
              }
            }}
            isDeleting={isDeletingSecurityGroup}
            error={deleteError}
          />
        </>
      )}
    </>
  )
}

import { useState, useEffect, useRef } from "react"
import { DataGrid, DataGridHeadCell, DataGridRow, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useNavigate } from "@tanstack/react-router"
import { useProjectId } from "@/client/hooks"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import type { UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { EditSecurityGroupModal } from "@/client/routes/_auth/accounts/$accountId/projects/$projectId/network/-components/SecurityGroups/-components/-modals/EditSecurityGroupModal"
import { DeleteSecurityGroupDialog } from "@/client/routes/_auth/accounts/$accountId/projects/$projectId/network/-components/SecurityGroups/-components/-modals/DeleteSecurityGroupDialog"
import { SecurityGroupTableRow, type SecurityGroupPermissions } from "@/client/routes/_auth/accounts/$accountId/projects/$projectId/network/-components/SecurityGroups/-components/SecurityGroupTableRow"

interface SecurityGroupListContainerProjectScopedProps {
  securityGroups: SecurityGroup[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  permissions: SecurityGroupPermissions
  onCreateClick?: () => void
  onDeleteSecurityGroup?: (securityGroupId: string) => void
  isDeletingSecurityGroup?: boolean
  deleteError?: string | null
  onUpdateSecurityGroup?: (
    securityGroupId: string,
    data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">
  ) => void
  isUpdatingSecurityGroup?: boolean
  updateError?: string | null
}

/**
 * Project-Scoped Security Group List Container
 *
 * Key difference from original: Uses new routing pattern /projects/:projectId/...
 * Does NOT require accountId for navigation
 */
export const SecurityGroupListContainerProjectScoped = ({
  securityGroups,
  isLoading,
  isError,
  error,
  permissions,
  onDeleteSecurityGroup,
  isDeletingSecurityGroup = false,
  deleteError = null,
  onUpdateSecurityGroup,
  isUpdatingSecurityGroup = false,
  updateError = null,
}: SecurityGroupListContainerProjectScopedProps) => {
  const navigate = useNavigate()
  const projectId = useProjectId() // Get projectId from URL directly
  const [selectedSecurityGroup, setSelectedSecurityGroup] = useState<SecurityGroup | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const prevIsDeletingRef = useRef<boolean>(false)
  const prevIsUpdatingRef = useRef<boolean>(false)

  const handleEdit = (sg: SecurityGroup) => {
    setSelectedSecurityGroup(sg)
    setEditModalOpen(true)
  }

  const handleDelete = (sg: SecurityGroup) => {
    setSelectedSecurityGroup(sg)
    setDeleteDialogOpen(true)
  }

  const handleViewDetails = (sg: SecurityGroup) => {
    // NEW: Navigate using project-scoped URL (no accountId needed!)
    navigate({
      to: "/projects/$projectId/network/securitygroups/$securityGroupId",
      params: { projectId, securityGroupId: sg.id },
    })
  }

  const closeEditModal = () => {
    setSelectedSecurityGroup(null)
    setEditModalOpen(false)
  }

  const closeDeleteDialog = () => {
    setSelectedSecurityGroup(null)
    setDeleteDialogOpen(false)
  }

  // Close delete dialog when deletion completes successfully
  useEffect(() => {
    const deletionJustFinished = prevIsDeletingRef.current && !isDeletingSecurityGroup

    if (deletionJustFinished && deleteDialogOpen && !deleteError) {
      closeDeleteDialog()
    }

    prevIsDeletingRef.current = isDeletingSecurityGroup
  }, [isDeletingSecurityGroup, deleteDialogOpen, deleteError])

  // Close edit modal when update completes successfully
  useEffect(() => {
    const updateJustFinished = prevIsUpdatingRef.current && !isUpdatingSecurityGroup

    if (updateJustFinished && editModalOpen && !updateError) {
      closeEditModal()
    }

    prevIsUpdatingRef.current = isUpdatingSecurityGroup
  }, [isUpdatingSecurityGroup, editModalOpen, updateError])

  const handleConfirmDelete = () => {
    if (selectedSecurityGroup && onDeleteSecurityGroup) {
      onDeleteSecurityGroup(selectedSecurityGroup.id)
    }
  }

  const handleUpdateSecurityGroup = async (
    securityGroupId: string,
    data: Omit<UpdateSecurityGroupInput, "securityGroupId" | "project_id">
  ): Promise<void> => {
    if (onUpdateSecurityGroup) {
      await onUpdateSecurityGroup(securityGroupId, data)
    }
  }

  if (isLoading) {
    return (
      <Stack distribution="center" alignment="center" className="py-8">
        <Spinner variant="primary" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <div className="text-theme-error p-4">
        <Trans>Error loading security groups</Trans>: {error?.message}
      </div>
    )
  }

  if (securityGroups.length === 0) {
    return (
      <div className="text-theme-light p-4">
        <Trans>No security groups found</Trans>
      </div>
    )
  }

  return (
    <>
      <DataGrid columns={5} className="security-groups-table">
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Description</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Shared</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Stateful</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Actions</Trans>
          </DataGridHeadCell>
        </DataGridRow>

        {securityGroups.map((sg) => (
          <SecurityGroupTableRow
            key={sg.id}
            securityGroup={sg}
            permissions={permissions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
          />
        ))}
      </DataGrid>

      {selectedSecurityGroup && (
        <>
          <EditSecurityGroupModal
            securityGroup={selectedSecurityGroup}
            open={editModalOpen}
            onClose={closeEditModal}
            onUpdate={(securityGroupId, data) => handleUpdateSecurityGroup(securityGroupId, data)}
            isLoading={isUpdatingSecurityGroup}
            error={updateError}
          />

          <DeleteSecurityGroupDialog
            securityGroup={selectedSecurityGroup}
            isOpen={deleteDialogOpen}
            onClose={closeDeleteDialog}
            onDelete={handleConfirmDelete}
            isDeleting={isDeletingSecurityGroup}
            error={deleteError}
          />
        </>
      )}
    </>
  )
}

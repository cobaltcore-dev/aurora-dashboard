import { useState, useEffect, useRef } from "react"
import { DataGrid, DataGridHeadCell, DataGridRow, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useParams } from "@tanstack/react-router"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import type { UpdateSecurityGroupInput } from "@/server/Network/types/securityGroup"
import { EditSecurityGroupModal } from "./-modals/EditSecurityGroupModal"
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
  onUpdateSecurityGroup?: (securityGroupId: string, data: Omit<UpdateSecurityGroupInput, "securityGroupId">) => void
  isUpdatingSecurityGroup?: boolean
  updateError?: string | null
  currentProjectId?: string
}

export const SecurityGroupListContainer = ({
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
  currentProjectId,
}: SecurityGroupListContainerProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId } = useParams({ strict: false })
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
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/securitygroups/$securityGroupId",
      params: { accountId: accountId!, projectId: projectId!, securityGroupId: sg.id },
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
    // Check if deletion just finished (was deleting before, now not deleting)
    const deletionJustFinished = prevIsDeletingRef.current && !isDeletingSecurityGroup

    // Close dialog if deletion just finished and there's no error
    if (deletionJustFinished && deleteDialogOpen && !deleteError) {
      closeDeleteDialog()
    }

    // Update the ref for next render
    prevIsDeletingRef.current = isDeletingSecurityGroup
  }, [isDeletingSecurityGroup, deleteError, deleteDialogOpen])

  // Close edit modal when update completes successfully
  useEffect(() => {
    // Check if update just finished (was updating before, now not updating)
    const updateJustFinished = prevIsUpdatingRef.current && !isUpdatingSecurityGroup

    // Close modal if update just finished and there's no error
    if (updateJustFinished && editModalOpen && !updateError) {
      closeEditModal()
    }

    // Update the ref for next render
    prevIsUpdatingRef.current = isUpdatingSecurityGroup
  }, [isUpdatingSecurityGroup, updateError, editModalOpen])

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
    return <Trans>There are no groups</Trans>
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
          // Compute isReadOnly: true if security group is not owned by current project
          const isReadOnly = currentProjectId ? sg.project_id !== currentProjectId : false

          return (
            <SecurityGroupTableRow
              key={sg.id}
              securityGroup={sg}
              permissions={permissions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              isReadOnly={isReadOnly}
            />
          )
        })}
      </DataGrid>

      {selectedSecurityGroup && (
        <>
          <EditSecurityGroupModal
            securityGroup={selectedSecurityGroup}
            open={editModalOpen}
            onClose={closeEditModal}
            onUpdate={async (id, data) => {
              if (onUpdateSecurityGroup) {
                await onUpdateSecurityGroup(id, data)
              }
            }}
            isLoading={isUpdatingSecurityGroup}
            error={updateError}
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

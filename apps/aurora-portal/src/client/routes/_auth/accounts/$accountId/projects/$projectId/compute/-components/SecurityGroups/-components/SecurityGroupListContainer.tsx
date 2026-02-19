import React, { useState } from "react"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  Stack,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { EditSecurityGroupModal } from "./-modals/EditSecurityGroupModal"
import { AccessControlModal } from "./-modals/AccessControlModal"
import { SecurityGroupTableRow, type SecurityGroupPermissions } from "./SecurityGroupTableRow"
import { useLoaderData } from "@tanstack/react-router"

interface SecurityGroupListContainerProps {
  securityGroups: SecurityGroup[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  permissions: SecurityGroupPermissions
}

export const SecurityGroupListContainer = ({
  securityGroups,
  isLoading,
  isError,
  error,
  permissions,
}: SecurityGroupListContainerProps) => {
  const { t } = useLingui()
  const [selectedSecurityGroup, setSelectedSecurityGroup] = useState<SecurityGroup | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [accessControlModalOpen, setAccessControlModalOpen] = useState(false)
  const { projectNameById } = useLoaderData({ from: "/_auth/accounts/$accountId/projects/$projectId" })

  const handleEdit = (sg: SecurityGroup) => {
    setSelectedSecurityGroup(sg)
    setEditModalOpen(true)
  }

  const handleAccessControl = (sg: SecurityGroup) => {
    setSelectedSecurityGroup(sg)
    setAccessControlModalOpen(true)
  }

  const handleViewDetails = () => {
    // Placeholder: when detail route exists, navigate like Images
  }

  const closeEditModal = () => {
    setSelectedSecurityGroup(null)
    setEditModalOpen(false)
  }

  const closeAccessControlModal = () => {
    setSelectedSecurityGroup(null)
    setAccessControlModalOpen(false)
  }

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
      <DataGrid columns={7} className="security-groups" data-testid="no-security-groups">
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
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <>
      <DataGrid columns={7}>
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>/<Trans>Id</Trans>
          </DataGridHeadCell>
          {[t`Description`, t`Owning Project`, t`Stateful`, t`Shared`, t`Created At`, t`Actions`].map((label) => (
            <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
          ))}
        </DataGridRow>
        {securityGroups.map((sg) => {
          const projectName = sg.project_id ? (projectNameById?.[sg.project_id] ?? t`-`) : t`-`
          return (
            <SecurityGroupTableRow
              key={sg.id}
              securityGroup={sg}
              projectName={projectName}
              permissions={permissions}
              onEdit={handleEdit}
              onAccessControl={handleAccessControl}
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
        </>
      )}
    </>
  )
}

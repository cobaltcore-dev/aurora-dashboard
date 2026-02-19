import React, { useState } from "react"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  Button,
  Icon,
  Stack,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { EditSecurityGroupModal } from "./-modals/EditSecurityGroupModal"
import { AccessControlModal } from "./-modals/AccessControlModal"
import { useLoaderData } from "@tanstack/react-router"

interface SecurityGroupListContainerProps {
  securityGroups: SecurityGroup[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
}

export const SecurityGroupListContainer = ({
  securityGroups,
  isLoading,
  isError,
  error,
}: SecurityGroupListContainerProps) => {
  const { t } = useLingui()
  const [modalComponent, setModalComponent] = useState<React.ReactElement | null>(null)
  const { projectNameById } = useLoaderData({ from: "/_auth/accounts/$accountId/projects/$projectId" })

  const formatDate = (date: string | null | undefined) => (date ? new Date(date).toLocaleDateString() : t`N/A`)
  const handleEdit = (sg: SecurityGroup) => {
    setModalComponent(
      <EditSecurityGroupModal
        securityGroup={sg}
        open={true}
        onClose={() => {
          setModalComponent(null)
        }}
      />
    )
  }

  // const handleDelete = (sg: SecurityGroup) => {
  //   // setDeleteDialogOpen(true)
  // }

  const handleAccessControl = (sg: SecurityGroup) => {
    setModalComponent(
      <AccessControlModal
        securityGroup={sg}
        open={true}
        onClose={() => {
          setModalComponent(null)
        }}
      />
    )
  }

  const handleViewDetails = (sg: SecurityGroup) => {
    console.log("View details for security group:", sg.id)
    // Navigation will be handled by TanStack Router
    // This is just a placeholder for the row click handler
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
        <Trans>{error?.message || "Failed to load security groups"}</Trans>
      </Stack>
    )
  }

  // Empty state
  if (securityGroups.length === 0) {
    return (
      <DataGrid columns={6} className="security-groups" data-testid="no-security-groups">
        <DataGridRow>
          <DataGridCell colSpan={6}>
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

  const BooleanIcon = ({ value }: { value: boolean | undefined }) => (
    <Icon icon={value ? "check" : "close"} color={value ? "text-theme-success" : "text-theme-error"} />
  )

  // Data grid with security groups
  return (
    <>
      <DataGrid columns={7}>
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>/<Trans>Id</Trans>
          </DataGridHeadCell>
          {["Description", "Owning Project", "Stateful", "Shared", "Created At", "Actions"].map((label) => (
            <DataGridHeadCell key={label}>
              <Trans>{label}</Trans>
            </DataGridHeadCell>
          ))}
        </DataGridRow>
        {securityGroups.map((sg) => {
          const projectName = sg.project_id ? projectNameById?.[sg.project_id] : t`-`
          return (
            <DataGridRow
              key={sg.id}
              className="cursor-pointer hover:bg-theme-background-lvl-1"
              onClick={() => handleViewDetails(sg)}
            >
              <DataGridCell>
                <div>
                  <p className="text-md">{sg.name}</p>
                  <p className="text-xs text-theme-secondary">{sg.id}</p>
                </div>
              </DataGridCell>
              <DataGridCell>{sg.description || t`—`}</DataGridCell>
              <DataGridCell>{projectName}</DataGridCell>
              <DataGridCell>
                <BooleanIcon value={sg.stateful} />
              </DataGridCell>
              <DataGridCell>
                <BooleanIcon value={sg.shared} />
              </DataGridCell>

              <DataGridCell>{formatDate(sg.created_at)}</DataGridCell>
              <DataGridCell onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                  <Button size="small" variant="subdued" icon="edit" onClick={() => handleEdit(sg)} title={t`Edit`} />
                  {/* <Button
                    size="small"
                    variant="subdued"
                    icon="deleteForever"
                    onClick={() => handleDelete(sg)}
                    title={t`Delete`}
                  /> */}
                  <Button
                    size="small"
                    variant="subdued"
                    icon="severityHigh"
                    onClick={() => handleAccessControl(sg)}
                    title={t`Access Control`}
                  />
                </div>
              </DataGridCell>
            </DataGridRow>
          )
        })}
      </DataGrid>

      {modalComponent}
    </>
  )
}

import {
  Button,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { useProjectId } from "@/client/hooks"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { useListWithFiltering } from "@/client/utils/useListWithFiltering"
import { trpcReact } from "@/client/trpcClient"
import { SecurityGroupDetailsView } from "./-components/SecurityGroupDetailsView"
import { EditSecurityGroupModal } from "../-components/-modals/EditSecurityGroupModal"
import { DeleteSecurityGroupDialog } from "../-components/-modals/DeleteSecurityGroupDialog"
import { useSecurityGroupDetails } from "./-hooks/useSecurityGroupDetails"
import { useSecurityGroupPermissions } from "../-hooks/useSecurityGroupPermissions"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"

export const Route = createFileRoute("/_auth/projects/$projectId/network/securitygroups/$securityGroupId/")({
  staticData: {
    section: "network",
    service: "securitygroups",
    analytics: {
      name: "network.securitygroups.detail",
    },
  } satisfies RouteInfo,
  loader: async ({ context, params }) => {
    const sg = await context.trpcClient?.network.securityGroup.getById.query({
      project_id: params.projectId,
      securityGroupId: params.securityGroupId,
    })
    return { sgTitle: sg?.name || sg?.id || null }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.sgTitle ?? "Security Group" }],
  }),
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []

    const serviceIndex = getServiceIndex(availableServices)

    // Redirect to the "Projects Overview" page if network service not available
    if (!serviceIndex["network"]) {
      throw redirect({
        to: "/projects/$projectId/network/securitygroups",
        params: { projectId: params.projectId },
      })
    }

    if (!serviceIndex["network"]["neutron"]) {
      // Redirect to the "Network Services Overview" page if the "Neutron" service is not available
      throw redirect({
        to: "/projects/$projectId/network/securitygroups",
        params: { projectId: params.projectId },
      })
    }
  },
})

function RouteComponent() {
  const { securityGroupId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  const projectId = useProjectId()
  const navigate = useNavigate()
  const { t } = useLingui()

  if (!trpcClient) {
    throw new Error("trpcClient is not available in route context")
  }

  const {
    permissions,
    isLoading: isLoadingPermissions,
    isError: isPermissionsError,
  } = useSecurityGroupPermissions(projectId)

  // Rules filtering using the same pattern as List page
  const {
    searchTerm: rulesSearchTerm,
    sortSettings,
    filterSettings,
    handleSearchChange,
    handleSortChange,
    handleFilterChange,
  } = useListWithFiltering<"direction" | "protocol" | "description">({
    defaultSortKey: "direction",
    defaultSortDir: "asc",
    sortOptions: [
      { label: t`Direction`, value: "direction" },
      { label: t`Protocol`, value: "protocol" },
      { label: t`Description`, value: "description" },
    ],
    filterSettings: {
      filters: [
        {
          displayName: t`Direction`,
          filterName: "direction",
          values: ["ingress", "egress"],
          supportsMultiValue: false,
        },
        {
          displayName: t`Ethertype`,
          filterName: "ethertype",
          values: ["IPv4", "IPv6"],
          supportsMultiValue: false,
        },
        {
          displayName: t`Protocol`,
          filterName: "protocol",
          values: ["tcp", "udp", "icmp", "ipv6-icmp"],
          supportsMultiValue: false,
        },
      ],
    },
  })

  // Group filter controls for the hook
  const filterControls = {
    searchTerm: rulesSearchTerm,
    onSearchChange: handleSearchChange,
    sortSettings,
    onSortChange: handleSortChange,
    filterSettings,
    onFilterChange: handleFilterChange,
  }

  // Fetch the project's security groups: they name rule remotes in the table, the delete dialog and the search,
  // and fill the Add Rule dropdown. The current group stays in the list:
  // a rule whose remote is its own group lets the group's instances reach each other (like Neutron's "default" group).
  const { data: securityGroups } = trpcReact.network.securityGroup.list.useQuery({ project_id: projectId })
  const availableSecurityGroups = useMemo(() => {
    return (securityGroups || []).map((sg) => {
      const name = sg.name || sg.id
      return {
        id: sg.id,
        name: sg.id === securityGroupId ? t`${name} (this group)` : name,
      }
    })
  }, [securityGroups, securityGroupId, t])

  // Use custom hook for logic (now includes filtering/sorting)
  const {
    securityGroup,
    filteredAndSortedRules,
    isLoading,
    isError,
    error,
    isUpdating,
    updateError,
    isDeleting,
    deleteError,
    isDeletingRule,
    deleteRuleError,
    isCreatingRule,
    createRuleError,
    editModalOpen,
    deleteModalOpen,
    handleEdit,
    handleCloseEditModal,
    handleUpdate,
    handleDelete,
    handleCloseDeleteModal,
    handleDeleteSecurityGroup,
    handleDeleteRule,
    handleCreateRule,
    clearCreateRuleError,
    clearDeleteRuleError,
  } = useSecurityGroupDetails({
    securityGroupId,
    filterControls,
    securityGroups: availableSecurityGroups,
  })

  useSetBreadcrumb(Route.id, securityGroup?.name ?? undefined)

  const handleBack = () => {
    navigate({
      to: "/projects/$projectId/network/securitygroups",
      params: { projectId },
    })
  }

  // Handle loading permissions
  if (isLoadingPermissions) {
    return <Status status="progress" title={t`Loading Permissions...`} />
  }

  // Handle permissions error - default to no permissions
  const safePermissions = isPermissionsError
    ? {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canCreateRule: false,
        canDeleteRule: false,
        canManageAccess: false,
        canViewRBAC: false,
      }
    : permissions!

  // Handle loading state
  if (isLoading) {
    return <Status status="progress" title={t`Loading Security Group Details...`} />
  }

  // Handle error state
  if (isError) {
    const errorMessage = error?.message || t`Unknown Error`

    return (
      <Status
        status="error"
        title={t`Error Loading Security Group`}
        body={errorMessage}
        action={
          <Button onClick={handleBack} variant="primary">
            <Trans>Back to Security Groups</Trans>
          </Button>
        }
      />
    )
  }

  // Handle no data state
  if (!securityGroup) {
    return (
      <Status
        status="empty"
        title={t`Security Group Not Found`}
        action={
          <Button onClick={handleBack} variant="primary">
            <Trans>Back to Security Groups</Trans>
          </Button>
        }
      />
    )
  }

  // Groups owned by another project are shared read-only copies: they cannot be edited or deleted,
  // the same rule the list applies to its row actions.
  const isReadOnly = Boolean(securityGroup.project_id && securityGroup.project_id !== projectId)
  // Neutron does not let the project's default group be renamed, and only an admin can delete it
  const canModify = !isReadOnly && securityGroup.name !== "default"
  const canEdit = safePermissions.canUpdate && canModify
  const canDelete = safePermissions.canDelete && canModify

  const headerActions = (canEdit || canDelete) && (
    <Stack gap="0.5" alignment="center">
      {canDelete && (
        <PopupMenu className="flex items-center">
          <PopupMenuToggle as="div">
            <Button icon="moreVert" title={t`More Actions`} disabled={isDeleting} />
          </PopupMenuToggle>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Delete Group`} onClick={handleDelete} />
          </PopupMenuOptions>
        </PopupMenu>
      )}

      {canEdit && (
        <Button variant="primary" onClick={handleEdit} disabled={isDeleting}>
          <Trans>Edit Details</Trans>
        </Button>
      )}
    </Stack>
  )

  const handleConfirmDelete = async () => {
    try {
      await handleDeleteSecurityGroup()
      handleBack()
    } catch {
      // The dialog stays open and shows deleteError
    }
  }

  // Render success state
  return (
    <Stack direction="vertical">
      <ContentHeader title={securityGroup.name || securityGroup.id} projectId={projectId} actions={headerActions} />

      <SecurityGroupDetailsView
        securityGroup={securityGroup}
        filteredAndSortedRules={filteredAndSortedRules}
        onDeleteRule={handleDeleteRule}
        isDeletingRule={isDeletingRule}
        deleteRuleError={deleteRuleError}
        filterControls={filterControls}
        onCreateRule={handleCreateRule}
        isCreatingRule={isCreatingRule}
        createRuleError={createRuleError}
        onClearCreateRuleError={clearCreateRuleError}
        onClearDeleteRuleError={clearDeleteRuleError}
        availableSecurityGroups={availableSecurityGroups}
        currentProjectId={projectId}
        permissions={safePermissions}
      />

      <EditSecurityGroupModal
        securityGroup={securityGroup}
        open={editModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdate}
        isLoading={isUpdating}
        error={updateError}
      />

      {deleteModalOpen && (
        <DeleteSecurityGroupDialog
          securityGroup={securityGroup}
          isOpen={deleteModalOpen}
          onClose={handleCloseDeleteModal}
          onDelete={handleConfirmDelete}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </Stack>
  )
}

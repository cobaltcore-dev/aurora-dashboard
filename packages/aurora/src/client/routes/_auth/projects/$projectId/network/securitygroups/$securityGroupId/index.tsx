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
  } = useSecurityGroupDetails({
    securityGroupId,
    filterControls,
  })

  useSetBreadcrumb(Route.id, securityGroup?.name ?? undefined)

  // Fetch available security groups for the Add Rule dropdown
  const { data: securityGroups } = trpcReact.network.securityGroup.list.useQuery({ project_id: projectId })
  const availableSecurityGroups = useMemo(() => {
    return (securityGroups || [])
      .filter((sg) => sg.id !== securityGroupId) // Exclude current group
      .map((sg) => ({
        id: sg.id,
        name: sg.name || sg.id,
      }))
  }, [securityGroups, securityGroupId])

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
    const errorMessage = error?.message || "Unknown error"

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading security group</Trans>
        </p>
        <p className="text-theme-highest">{errorMessage}</p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Security Groups</Trans>
        </Button>
      </Stack>
    )
  }

  // Handle no data state
  if (!securityGroup) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-secondary">
          <Trans>Security group not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Security Groups</Trans>
        </Button>
      </Stack>
    )
  }

  // Groups owned by another project are shared read-only copies: they cannot be edited or deleted,
  // the same rule the list applies to its row actions.
  const isReadOnly = Boolean(securityGroup.project_id && securityGroup.project_id !== projectId)
  const canEdit = safePermissions.canUpdate && !isReadOnly
  const canDelete = safePermissions.canDelete && !isReadOnly

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
      // onError surfaces the toast; the dialog keeps showing deleteError
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

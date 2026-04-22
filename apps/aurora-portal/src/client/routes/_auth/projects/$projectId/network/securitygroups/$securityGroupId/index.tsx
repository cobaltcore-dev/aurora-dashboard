import { Breadcrumb, BreadcrumbItem, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { Trans, useLingui } from "@lingui/react/macro"
import { useMemo } from "react"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { useProjectId } from "@/client/hooks"
import { SecurityGroupDetailsView } from "@/client/routes/_auth/accounts/$accountId/projects/$projectId/network/securitygroups/$securityGroupId/-components/SecurityGroupDetailsView"
import { EditSecurityGroupModal } from "@/client/routes/_auth/accounts/$accountId/projects/$projectId/network/-components/SecurityGroups/-components/-modals/EditSecurityGroupModal"
import { useSecurityGroupDetails } from "@/client/routes/_auth/accounts/$accountId/projects/$projectId/network/securitygroups/$securityGroupId/-hooks/useSecurityGroupDetails"
import { useListWithFiltering } from "@/client/utils/useListWithFiltering"
import { trpcReact } from "@/client/trpcClient"

export const Route = createFileRoute("/_auth/projects/$projectId/network/securitygroups/$securityGroupId/")({
  staticData: { section: "network", service: "securitygroups", isDetail: true } satisfies RouteInfo,
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
  const projectId = useProjectId()
  const navigate = useNavigate()
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()

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
    isDeletingRule,
    deleteRuleError,
    isCreatingRule,
    createRuleError,
    editModalOpen,
    handleEdit,
    handleCloseEditModal,
    handleUpdate,
    handleDeleteRule,
    handleCreateRule,
  } = useSecurityGroupDetails({
    securityGroupId,
    filterControls,
  })

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

  // Handle loading state
  if (isLoading) {
    setPageTitle(t`Loading...`)
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Security Group Details...</Trans>
      </Stack>
    )
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

  // Render success state
  setPageTitle(securityGroup.name || securityGroup.id)
  return (
    <Stack direction="vertical">
      <Breadcrumb className="my-6">
        <BreadcrumbItem onClick={handleBack} label={t`Security Groups`} />
        <BreadcrumbItem active label={securityGroup.id} />
      </Breadcrumb>

      <SecurityGroupDetailsView
        securityGroup={securityGroup}
        filteredAndSortedRules={filteredAndSortedRules}
        onEdit={handleEdit}
        onDeleteRule={handleDeleteRule}
        isDeletingRule={isDeletingRule}
        deleteRuleError={deleteRuleError}
        filterControls={filterControls}
        onCreateRule={handleCreateRule}
        isCreatingRule={isCreatingRule}
        createRuleError={createRuleError}
        availableSecurityGroups={availableSecurityGroups}
      />

      <EditSecurityGroupModal
        securityGroup={securityGroup}
        open={editModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdate}
        isLoading={isUpdating}
        error={updateError}
      />
    </Stack>
  )
}

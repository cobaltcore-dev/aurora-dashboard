import { useLoaderData, useRouteContext } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Stack, TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import { useSharedFileSystemPermissions } from "@/client/hooks/useSharedFileSystemPermissions"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"
import { ShareNetworkSubnetsTable } from "./ShareNetworkSubnetsTable"
import { ShareNetworkSecurityServicesTable } from "./ShareNetworkSecurityServicesTable"
import { isShareNetworkDetailsTab, type ShareNetworkDetailsTab } from "./shareNetworkDetailUtils"

interface ShareNetworkDetailsViewProps {
  shareNetwork: ShareNetwork
  projectId: string
  activeTab: ShareNetworkDetailsTab
  onTabChange: (tab: ShareNetworkDetailsTab) => void
}

export function ShareNetworkDetailsView({
  shareNetwork,
  projectId,
  activeTab,
  onTabChange,
}: ShareNetworkDetailsViewProps) {
  const { t } = useLingui()
  const permissions = useSharedFileSystemPermissions(projectId)

  // Neutron deep-link degrades gracefully: only link when the network service is in the catalog and
  // the Networks scope is enabled — not merely because the route exists in the build.
  const { availableServices } = useLoaderData({ from: "/_auth/projects/$projectId" })
  const { enabledServices, deniedServices } = useRouteContext({ strict: false })
  const isEnabled = (service: string) =>
    (!enabledServices || enabledServices.includes(service)) && !deniedServices?.includes(service)
  const networksAvailable = Boolean(getServiceIndex(availableServices ?? [])["network"]) && isEnabled("networks")

  // Eager security-services query that starts on mount, whatever the active tab
  const {
    data: securityServices = [],
    isLoading: isLoadingSecurityServices,
    error: securityServicesError,
    refetch: refetchSecurityServices,
  } = trpcReact.sharedFileSystem.listSecurityServices.useQuery(
    { project_id: projectId, shareNetworkId: shareNetwork.id },
    { enabled: permissions.canListSecurityServices, retry: false }
  )

  // Dates
  const createdDate = parseManilaTimestamp(shareNetwork.created_at)
  const updatedDate = parseManilaTimestamp(shareNetwork.updated_at)

  const basicInfoItems: DetailListItem[] = [
    { label: t`Name`, value: shareNetwork.name },
    { label: t`ID`, value: <ClipboardText text={shareNetwork.id} /> },
    { label: t`Description`, value: shareNetwork.description },
    { label: t`Created`, value: createdDate?.toLocaleString() },
    { label: t`Updated`, value: updatedDate?.toLocaleString() },
  ]

  const tabLabels: Record<ShareNetworkDetailsTab, string> = {
    subnets: t`Subnets`,
    "security-services": t`Security Services`,
  }

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <TwoColumnDescriptionList items={basicInfoItems} />

      <Stack direction="vertical" gap="4">
        {/* TabBar keeps its own active item once a tab is clicked, so activeItem keeps it in sync with
            the URL. `active` only covers the first render, before activeItem is applied. */}
        <TabBar
          appearance="tabs"
          ariaLabel={t`Share network detail sections`}
          activeItem={activeTab}
          onActiveItemChange={(value) => isShareNetworkDetailsTab(value) && onTabChange(value)}
        >
          <TabBarItem label={tabLabels.subnets} value="subnets" active={activeTab === "subnets"} />
          <TabBarItem
            label={tabLabels["security-services"]}
            value="security-services"
            active={activeTab === "security-services"}
          />
        </TabBar>

        {activeTab === "subnets" && (
          <ShareNetworkSubnetsTable
            subnets={shareNetwork.share_network_subnets ?? []}
            projectId={projectId}
            networksAvailable={networksAvailable}
          />
        )}

        {activeTab === "security-services" && (
          <ShareNetworkSecurityServicesTable
            securityServices={securityServices}
            isLoading={isLoadingSecurityServices}
            error={securityServicesError}
            canList={permissions.canListSecurityServices}
            onRetry={() => void refetchSecurityServices()}
          />
        )}
      </Stack>
    </Stack>
  )
}

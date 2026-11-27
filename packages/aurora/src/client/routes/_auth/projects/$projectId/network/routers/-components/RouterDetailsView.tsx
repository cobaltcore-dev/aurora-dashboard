import { ReactNode } from "react"
import { StatusLabel } from "@/client/components/StatusLabel"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeading, Stack, Status, TabNavigation, TabNavigationItem } from "@cloudoperators/juno-ui-components"
import type { RouterDetails } from "@/server/Network/types/router"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import { RouterInterfacesTable } from "./RouterInterfacesTable"
import { RouterExternalGatewayTable } from "./RouterExternalGatewayTable"

/** Tabs of the router details view, in display order. The first one is the default. */
export const ROUTER_DETAILS_TABS = ["external", "internal"] as const

export type RouterDetailsTab = (typeof ROUTER_DETAILS_TABS)[number]

export const DEFAULT_ROUTER_DETAILS_TAB: RouterDetailsTab = "external"

export const isRouterDetailsTab = (value: unknown): value is RouterDetailsTab =>
  ROUTER_DETAILS_TABS.includes(value as RouterDetailsTab)

interface RouterDetailsViewProps {
  router: RouterDetails
  /** Active tab, owned by the route's `tab` search param */
  activeTab: RouterDetailsTab
  onTabChange: (tab: RouterDetailsTab) => void
}

export function RouterDetailsView({ router, activeTab, onTabChange }: RouterDetailsViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()

  const {
    data: interfaces = [],
    isLoading: isLoadingInterfaces,
    isError: isInterfacesError,
    error: interfacesError,
    refetch: refetchInterfaces,
  } = trpcReact.network.routers.listInterfaces.useQuery({ project_id: projectId, router_id: router.id })

  const gateway = router.external_gateway_info

  const basicInfoItems: DetailListItem[] = [
    { label: t`Name`, value: router.name || undefined },
    { label: t`ID`, value: <ClipboardText text={router.id} /> },
    { label: t`Project ID`, value: <ClipboardText text={router.project_id} /> },
    { label: t`Description`, value: router.description || undefined },
    { label: t`Status`, value: <StatusLabel value={router.status} /> },
    { label: t`Admin State`, value: <StatusLabel value={router.admin_state_up ? t`UP` : t`DOWN`} /> },
  ]

  const tabLabels: Record<RouterDetailsTab, string> = {
    external: t`External Networks`,
    internal: t`Internal Networks`,
  }

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <Stack direction="vertical" gap="2">
        <ContentHeading>
          <Trans>Basic Info</Trans>
        </ContentHeading>
        <TwoColumnDescriptionList items={basicInfoItems} />
      </Stack>

      <Stack direction="vertical" gap="4">
        {/* TabNavigation keeps its own active item once a tab is clicked, so activeItem keeps it in sync with
            the URL. `active` only covers the first render, before activeItem is applied. */}
        <TabNavigation
          activeItem={activeTab}
          onActiveItemChange={(value: ReactNode) => isRouterDetailsTab(value) && onTabChange(value)}
        >
          {ROUTER_DETAILS_TABS.map((tab) => (
            <TabNavigationItem key={tab} label={tabLabels[tab]} value={tab} active={activeTab === tab} />
          ))}
        </TabNavigation>

        {activeTab === "external" &&
          (gateway ? (
            <RouterExternalGatewayTable gateway={gateway} />
          ) : (
            <Status
              status="empty"
              title={t`No External Gateway`}
              body={t`This router is not connected to an external network.`}
            />
          ))}

        {activeTab === "internal" && (
          <RouterInterfacesTable
            interfaces={interfaces}
            isLoading={isLoadingInterfaces}
            isError={isInterfacesError}
            error={interfacesError}
            onRetry={() => refetchInterfaces()}
          />
        )}
      </Stack>
    </Stack>
  )
}

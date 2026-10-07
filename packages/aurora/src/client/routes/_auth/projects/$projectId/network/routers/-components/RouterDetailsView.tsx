import { Fragment, ReactNode, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Status,
  TabNavigation,
  TabNavigationItem,
} from "@cloudoperators/juno-ui-components"
import type { RouterDetails } from "@/server/Network/types/router"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { RouterInterfacesTable } from "./RouterInterfacesTable"

type RouterDetailsTab = "external" | "internal"

interface RouterDetailsViewProps {
  router: RouterDetails
}

interface DetailItem {
  label: string
  value: ReactNode
}

const DetailsList = ({ items, keyPrefix }: { items: DetailItem[]; keyPrefix: string }) => (
  <DescriptionList alignTerms="right">
    {items.map(({ label, value }, index) => (
      <Fragment key={`${keyPrefix}-${index}`}>
        <DescriptionTerm>{label}</DescriptionTerm>
        <DescriptionDefinition>
          <div className="break-all">{value}</div>
        </DescriptionDefinition>
      </Fragment>
    ))}
  </DescriptionList>
)

export function RouterDetailsView({ router }: RouterDetailsViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [activeTab, setActiveTab] = useState<RouterDetailsTab>("external")

  const {
    data: interfaces = [],
    isLoading: isLoadingInterfaces,
    isError: isInterfacesError,
    error: interfacesError,
    refetch: refetchInterfaces,
  } = trpcReact.network.routers.listInterfaces.useQuery({ project_id: projectId, router_id: router.id })

  const gateway = router.external_gateway_info

  const basicInfoItems: DetailItem[] = [
    { label: t`Name`, value: router.name || "—" },
    { label: t`ID`, value: <ClipboardText text={router.id} /> },
    { label: t`Project ID`, value: <ClipboardText text={router.project_id} /> },
    { label: t`Description`, value: router.description || "—" },
    { label: t`Status`, value: router.status },
    { label: t`Admin State`, value: router.admin_state_up ? t`UP` : t`DOWN` },
  ]

  const externalNetworkItems: DetailItem[] = gateway
    ? [
        { label: t`Network Name`, value: gateway.network_name || "—" },
        { label: t`Network ID`, value: <ClipboardText text={gateway.network_id} /> },
        ...(gateway.enable_snat !== undefined
          ? [{ label: t`SNAT`, value: gateway.enable_snat ? t`Enabled` : t`Disabled` }]
          : []),
        {
          label: t`External Fixed IPs`,
          value:
            gateway.external_fixed_ips && gateway.external_fixed_ips.length > 0 ? (
              <ul className="list-disc pl-4" data-testid="external-fixed-ips">
                {gateway.external_fixed_ips.map((fixedIp) => (
                  <li key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`}>
                    <div>
                      <span className="font-bold">
                        <Trans>Subnet ID:</Trans>
                      </span>{" "}
                      {fixedIp.subnet_id}
                      {fixedIp.subnet_name && <span className="text-theme-light"> ({fixedIp.subnet_name})</span>}
                    </div>
                    <div>
                      <span className="font-bold">
                        <Trans>IP:</Trans>
                      </span>{" "}
                      {fixedIp.ip_address}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              "—"
            ),
        },
      ]
    : []

  const tabs = [
    { label: t`External Networks`, value: "external" },
    { label: t`Internal Networks`, value: "internal" },
  ]

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <DetailsList items={basicInfoItems} keyPrefix="basic" />

      <Stack direction="vertical" gap="4">
        <TabNavigation
          activeItem={activeTab}
          onActiveItemChange={(value: ReactNode) => setActiveTab(value as RouterDetailsTab)}
        >
          {tabs.map((tab) => (
            <TabNavigationItem key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </TabNavigation>

        {activeTab === "external" &&
          (gateway ? (
            <DetailsList items={externalNetworkItems} keyPrefix="external" />
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

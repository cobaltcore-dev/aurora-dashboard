import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import { useLingui, Trans } from "@lingui/react/macro"
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  ButtonRow,
  ContentHeading,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { getServiceIndex } from "@/server/Authentication/helpers"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId"
)({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []

    const serviceIndex = getServiceIndex(availableServices)

    // Redirect to the "Projects Overview" page if network service not available
    if (!serviceIndex["network"]) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }

    if (!serviceIndex["network"]["neutron"]) {
      // Redirect to the "Network Services Overview" page if the "Neutron" service is not available
      throw redirect({
        to: "/accounts/$accountId/projects/$projectId/network/$",
        params: { ...params, _splat: undefined },
      })
    }
  },
})

function RouteComponent() {
  const { t } = useLingui()

  const navigate = useNavigate()
  const { accountId, projectId, floatingIpId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId",
  })

  const navigateToProjectNetwork = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/$",
      params: { accountId, projectId, _splat: undefined },
    })
  }

  const navigateToFloatingIps = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/$",
      params: { accountId, projectId, _splat: "floatingips" },
    })
  }

  return (
    // Replace {{ }} with real data from .getById(floatingIpId) query
    <Stack direction="vertical">
      {/* Breacrumbs */}
      <Breadcrumb className="my-6">
        <BreadcrumbItem icon="home" label={t`Overview`} onClick={navigateToProjectNetwork} />
        <BreadcrumbItem label={t`Floating IPs`} onClick={navigateToFloatingIps} />
        <BreadcrumbItem active label={floatingIpId} />
      </Breadcrumb>

      {/* Description */}
      <ContentHeading>IP: {"{{ 192:168.4.200 }}"}</ContentHeading>
      <p className="text-theme-secondary mt-2 text-sm">
        <Trans>
          Full lifecycle management of Floating IPs, including attachement, port association/disassociation, DNS
          settings, and deletion
        </Trans>
      </p>

      {/* Actions */}
      <ButtonRow>
        <Button>Edit Description</Button>
        <Button>Attach</Button>
        <Button>Detach</Button>
        <Button>Release</Button>
      </ButtonRow>

      {/* Details */}
      {/* Use Image/Flavor as example of single column  */}
      {/* Replace Layout in general (paddings/margings etc as in block, as between) after Call design team on Monday */}
      <DataGrid columns={4} gridColumnTemplate="15% 35% 15% 35%">
        <DataGridRow>
          <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
          <DataGridCell colSpan={3}>{"{{ description }}"}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
          <DataGridCell>{"{{ id }}"}</DataGridCell>
          <DataGridHeadCell>{t`Tags`}</DataGridHeadCell>
          <DataGridCell>{"{{ tags }}"}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
          <DataGridCell>{"{{ name }}"}</DataGridCell>
          <DataGridHeadCell>{t`Stateful`}</DataGridHeadCell>
          <DataGridCell>{"{{ stateful }}"}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Owning Project ID`}</DataGridHeadCell>
          <DataGridCell>{"{{ project_id }}"}</DataGridCell>
          <DataGridHeadCell>{t`Shared`}</DataGridHeadCell>
          <DataGridCell>{"{{ shared }}"}</DataGridCell>
        </DataGridRow>
      </DataGrid>
    </Stack>
  )
}

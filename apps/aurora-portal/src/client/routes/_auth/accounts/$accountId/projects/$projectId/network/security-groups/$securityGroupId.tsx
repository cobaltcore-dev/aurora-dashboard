import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Stack,
  Spinner,
  ContentHeading,
} from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { SecurityGroupDetailsView } from "../-components/SecurityGroups/-components/SecurityGroupDetailsView"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/network/security-groups/$securityGroupId"
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
  const { accountId, projectId, securityGroupId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/network/security-groups/$securityGroupId",
  })
  const navigate = useNavigate()
  const { t } = useLingui()

  const { data: securityGroup, status, error } = trpcReact.network.getSecurityGroupById.useQuery({ securityGroupId })

  const handleBack = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/$",
      params: { accountId, projectId, _splat: "security-groups" },
    })
  }

  // Helper function with proper type guard for securityGroup.name
  const getSecurityGroupName = (): React.ReactNode => {
    if (securityGroup && typeof securityGroup.name === "string" && securityGroup.name.trim()) {
      return securityGroup.name
    }
    return <Trans>Unnamed</Trans>
  }

  // Handle loading state
  if (status === "pending") {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Security Group Details...</Trans>
      </Stack>
    )
  }

  // Handle error state
  if (status === "error") {
    const errorMessage = error?.message || "Unknown error"

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading security group</Trans>
        </p>
        <p className="text-theme-hight">{errorMessage}</p>
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
        <p className="text-theme-hight">
          <Trans>Security group not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Security Groups</Trans>
        </Button>
      </Stack>
    )
  }

  // Render success state
  return (
    <Stack direction="vertical">
      <Breadcrumb className="my-6">
        <BreadcrumbItem
          onClick={() => {
            navigate({
              to: "/accounts/$accountId/projects/$projectId/network/$",
              params: { accountId, projectId, _splat: undefined },
            })
          }}
          label={t`Overview`}
          icon="home"
        />
        <BreadcrumbItem onClick={handleBack} label={t`Security Groups`} />
        <BreadcrumbItem active label={securityGroup.id} />
      </Breadcrumb>

      <Stack direction="vertical" distribution="between">
        <ContentHeading className="text-theme-highest text-2xl font-bold">{getSecurityGroupName()}</ContentHeading>
      </Stack>

      <SecurityGroupDetailsView securityGroup={securityGroup} />
    </Stack>
  )
}

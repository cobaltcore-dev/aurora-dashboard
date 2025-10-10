import { linkOptions, useParams } from "@tanstack/react-router"
import { SubNavigationLayout } from "@/client/components/navigation/SubNavigationLayout"

export function ProjectSubNavigation({
  availableServices,
}: {
  availableServices: {
    type: string
    name: string
  }[]
}) {
  const params = useParams({ from: "/_auth/accounts/$accountId/projects/$projectId" })

  const getNavigationOptions = () => [
    ...(availableServices.find(({ type }) => type === "compute") ||
    availableServices.find(({ type }) => type === "image")
      ? [
          linkOptions({
            to: "/accounts/$accountId/projects/$projectId/compute/$",
            label: "Compute",
            params: {
              accountId: "accountId",
              projectId: "projectId",
            },
          }),
        ]
      : []),
    linkOptions({
      to: "/accounts/$accountId/projects/$projectId/gardener/clusters",
      label: "Gardener",
      params: {
        accountId: "accountId",
        projectId: "projectId",
      },
    }),
    ...(availableServices.find(({ type }) => type === "network")
      ? [
          linkOptions({
            to: "/accounts/$accountId/projects/$projectId/network",
            label: "Network",
            params: {
              accountId: "accountId",
              projectId: "projectId",
            },
          }),
        ]
      : []),
  ]

  const options = getNavigationOptions()

  return <SubNavigationLayout options={options} params={params} />
}

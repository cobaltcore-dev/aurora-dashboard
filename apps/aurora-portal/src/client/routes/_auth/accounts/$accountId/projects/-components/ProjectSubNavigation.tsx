import { linkOptions, useParams } from "@tanstack/react-router"
import { SubNavigationLayout } from "@/client/components/navigation/SubNavigationLayout"

const options = [
  linkOptions({
    to: "/accounts/$accountId/projects/$projectId/compute/$",
    label: "Compute",
    params: {
      accountId: "accountId",
      projectId: "projectId",
    },
  }),
  linkOptions({
    to: "/accounts/$accountId/projects/$projectId/gardener/clusters",
    label: "Gardener",
    params: {
      accountId: "accountId",
      projectId: "projectId",
    },
  }),
  linkOptions({
    to: "/accounts/$accountId/projects/$projectId/network",
    label: "Network",
    params: {
      accountId: "accountId",
      projectId: "projectId",
    },
  }),
]

export function ProjectSubNavigation() {
  const params = useParams({ from: "/_auth/accounts/$accountId/projects/$projectId" })
  return <SubNavigationLayout options={options} params={params} />
}

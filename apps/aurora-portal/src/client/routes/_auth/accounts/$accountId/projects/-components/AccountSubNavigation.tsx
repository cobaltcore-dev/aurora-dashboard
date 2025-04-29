import { linkOptions, useParams } from "@tanstack/react-router"
import { SubNavigationLayout } from "@/client/components/navigation/SubNavigationLayout"

const options = [
  linkOptions({
    to: "/accounts/$accountId/projects",
    label: "Projects Overview",
    params: {
      accountId: "accountId",
    },
  }),
]

export function AccountSubNavigation() {
  const params = useParams({ from: "/_auth/accounts/$accountId/projects/" })
  return <SubNavigationLayout options={options} params={params} />
}

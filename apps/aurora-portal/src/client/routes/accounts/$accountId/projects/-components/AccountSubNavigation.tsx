import { linkOptions, useParams } from "@tanstack/react-router"
import { SubNavigationLayout } from "../../../../../components/navigation/SubNavigationLayout"

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
  const params = useParams({ from: "/accounts/$accountId/projects/" })
  return <SubNavigationLayout options={options} params={params} />
}

import { useParams } from "@tanstack/react-router"
import { SubNavigationLayout } from "@/client/components/navigation/SubNavigationLayout"
import { useLingui } from "@lingui/react/macro"

export function AccountSubNavigation() {
  const { t } = useLingui()
  const params = useParams({ from: "/_auth/accounts/$accountId/projects/" })

  const options = [
    {
      to: "/accounts/$accountId/projects",
      label: t`Projects Overview`,
    },
  ]

  return <SubNavigationLayout options={options} params={params} />
}

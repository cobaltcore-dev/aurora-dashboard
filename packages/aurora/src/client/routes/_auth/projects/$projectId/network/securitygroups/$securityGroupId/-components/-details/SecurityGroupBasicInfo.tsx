import { Stack } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"

interface SecurityGroupBasicInfoProps {
  securityGroup: SecurityGroup
}

export function SecurityGroupBasicInfo({ securityGroup }: SecurityGroupBasicInfoProps) {
  const { t } = useLingui()

  const securityGroupItems = [
    { label: t`Name`, value: securityGroup.name || t`—` },
    { label: t`Description`, value: securityGroup.description || t`—` },
    { label: t`ID`, value: securityGroup.id },
    { label: t`Tags`, value: securityGroup.tags?.join(", ") || t`—` },
    { label: t`Stateful`, value: (securityGroup.stateful ?? true) ? t`Yes` : t`No` },
    { label: t`Owning Project ID`, value: securityGroup.project_id || t`—` },
    { label: t`Shared`, value: securityGroup.shared ? t`Yes` : t`No` },
  ]

  return (
    <Stack direction="vertical" gap="2">
      <h2>{t`General Information`}</h2>
      <TwoColumnDescriptionList items={securityGroupItems} />
    </Stack>
  )
}

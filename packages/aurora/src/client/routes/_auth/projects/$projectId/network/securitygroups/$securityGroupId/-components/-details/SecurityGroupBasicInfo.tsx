import { Button } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"

interface SecurityGroupBasicInfoProps {
  securityGroup: SecurityGroup
  onEdit?: () => void
  canUpdate: boolean
}

export function SecurityGroupBasicInfo({ securityGroup, onEdit, canUpdate }: SecurityGroupBasicInfoProps) {
  const { t } = useLingui()

  const securityGroupItems = [
    { label: t`Description`, value: securityGroup.description || t`—` },
    { label: t`ID`, value: securityGroup.id },
    { label: t`Tags`, value: securityGroup.tags?.join(", ") || t`—` },
    { label: t`Name`, value: securityGroup.name || t`—` },
    { label: t`Stateful`, value: securityGroup.stateful ? t`Yes` : t`No` },
    { label: t`Owning Project ID`, value: securityGroup.project_id || t`—` },
    { label: t`Shared`, value: securityGroup.shared ? t`Yes` : t`No` },
  ]

  return (
    <>
      <div className="mb-4 flex flex-row-reverse">
        {onEdit && canUpdate && (
          <Button variant="primary" onClick={onEdit} disabled={!canUpdate}>
            <Trans>Edit</Trans>
          </Button>
        )}
      </div>

      <TwoColumnDescriptionList items={securityGroupItems} />
    </>
  )
}

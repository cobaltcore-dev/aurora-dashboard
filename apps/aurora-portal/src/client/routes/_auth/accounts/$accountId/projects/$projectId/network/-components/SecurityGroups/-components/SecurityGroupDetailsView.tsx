import { DataGrid, DataGridRow, DataGridCell, Button, Stack } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { Container, ContentHeading, DataGridHeadCell } from "@cloudoperators/juno-ui-components"

interface SecurityGroupDetailsViewProps {
  securityGroup: SecurityGroup
  onEdit?: () => void
}

export function SecurityGroupDetailsView({ securityGroup, onEdit }: SecurityGroupDetailsViewProps) {
  const { t } = useLingui()

  const BooleanValue = ({ value }: { value: boolean | undefined }) => <span>{value ? t`Yes` : t`No`}</span>

  return (
    <Container px={false} py>
      <Stack direction="vertical" gap="4">
        <div className="mb-2">
          <ContentHeading>{t`Security Group Basic Info`}</ContentHeading>
          <p className="text-theme-secondary mt-2 text-sm">
            <Trans>
              Configure the ingress and egress rules that control which traffic is allowed for this security group.
            </Trans>
          </p>
        </div>
        <div className="flex justify-end">
          {onEdit && (
            <Button variant="primary" onClick={onEdit}>
              <Trans>Edit</Trans>
            </Button>
          )}
        </div>

        <DataGrid columns={4} gridColumnTemplate="15% 35% 15% 35%">
          <DataGridRow>
            <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
            <DataGridCell colSpan={3}>{securityGroup.description || t`—`}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
            <DataGridCell>{securityGroup.id}</DataGridCell>
            <DataGridHeadCell>{t`Tags`}</DataGridHeadCell>
            <DataGridCell>{securityGroup.tags?.join(", ") || t`—`}</DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
            <DataGridCell>{securityGroup.name}</DataGridCell>
            <DataGridHeadCell>{t`Stateful`}</DataGridHeadCell>
            <DataGridCell>
              <BooleanValue value={securityGroup.stateful} />
            </DataGridCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridHeadCell>{t`Owning Project ID`}</DataGridHeadCell>
            <DataGridCell>{securityGroup.project_id || t`—`}</DataGridCell>
            <DataGridHeadCell>{t`Shared`}</DataGridHeadCell>
            <DataGridCell>
              <BooleanValue value={securityGroup.shared} />
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
      </Stack>
    </Container>
  )
}

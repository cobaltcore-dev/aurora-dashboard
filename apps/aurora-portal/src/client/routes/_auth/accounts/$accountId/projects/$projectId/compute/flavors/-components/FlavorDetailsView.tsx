import {
  Stack,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  ContentHeading,
} from "@cloudoperators/juno-ui-components/index"
import { Trans } from "@lingui/react/macro"
import type { Flavor } from "@/server/Compute/types/flavor"

interface FlavorDetailsViewProps {
  flavor: Flavor
}

export function FlavorDetailsView({ flavor }: FlavorDetailsViewProps) {
  const formatBytes = (bytes: number, unit: string = "MB") => {
    if (bytes === 0) return `0 ${unit}`
    return `${bytes} ${unit}`
  }

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <Stack direction="vertical" gap="2">
        <ContentHeading>
          <Trans>Basic Information</Trans>
        </ContentHeading>
        <DataGrid columns={2}>
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>ID</Trans>
            </DataGridHeadCell>
            <DataGridCell>{flavor.id}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Name</Trans>
            </DataGridHeadCell>
            <DataGridCell>{flavor.name}</DataGridCell>
          </DataGridRow>

          {flavor.description && (
            <DataGridRow>
              <DataGridHeadCell>
                <Trans>Description</Trans>
              </DataGridHeadCell>
              <DataGridCell>{flavor.description}</DataGridCell>
            </DataGridRow>
          )}

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Public</Trans>
            </DataGridHeadCell>
            <DataGridCell>{flavor["os-flavor-access:is_public"] ? <Trans>Yes</Trans> : <Trans>No</Trans>}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Disabled</Trans>
            </DataGridHeadCell>
            <DataGridCell>{flavor["OS-FLV-DISABLED:disabled"] ? <Trans>Yes</Trans> : <Trans>No</Trans>}</DataGridCell>
          </DataGridRow>
        </DataGrid>
      </Stack>

      <Stack direction="vertical" gap="2">
        <ContentHeading>
          <Trans>Hardware Specifications</Trans>
        </ContentHeading>
        <DataGrid columns={2}>
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>VCPUs</Trans>
            </DataGridHeadCell>
            <DataGridCell>{flavor.vcpus}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>RAM</Trans>
            </DataGridHeadCell>
            <DataGridCell>{formatBytes(flavor.ram, "MiB")}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Disk</Trans>
            </DataGridHeadCell>
            <DataGridCell>{formatBytes(flavor.disk, "GiB")}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Ephemeral Disk</Trans>
            </DataGridHeadCell>
            <DataGridCell>{formatBytes(flavor["OS-FLV-EXT-DATA:ephemeral"] || 0, "GiB")}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Swap</Trans>
            </DataGridHeadCell>
            <DataGridCell>
              {flavor.swap === 0 || flavor.swap === "" ? <Trans>None</Trans> : formatBytes(Number(flavor.swap), "MiB")}
            </DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridHeadCell>
              <Trans>RX/TX Factor</Trans>
            </DataGridHeadCell>
            <DataGridCell>{flavor.rxtx_factor}</DataGridCell>
          </DataGridRow>
        </DataGrid>
      </Stack>

      {flavor.extra_specs && Object.keys(flavor.extra_specs).length > 0 && (
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Extra Specs</Trans>
          </ContentHeading>
          <DataGrid columns={2}>
            {Object.entries(flavor.extra_specs).map(([key, value]) => (
              <DataGridRow key={key}>
                <DataGridHeadCell>{key}</DataGridHeadCell>
                <DataGridCell>{value}</DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        </Stack>
      )}
    </Stack>
  )
}

import { Stack, DataGrid, DataGridRow, DataGridCell } from "@cloudoperators/juno-ui-components/index"
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
      {/* Basic Information */}
      <Stack direction="vertical" gap="2">
        <h3 className="text-lg font-semibold text-theme-highest">
          <Trans>Basic Information</Trans>
        </h3>
        <DataGrid columns={2}>
          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>ID</Trans>
            </DataGridCell>
            <DataGridCell>{flavor.id}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>Name</Trans>
            </DataGridCell>
            <DataGridCell>{flavor.name}</DataGridCell>
          </DataGridRow>

          {flavor.description && (
            <DataGridRow>
              <DataGridCell className="font-medium">
                <Trans>Description</Trans>
              </DataGridCell>
              <DataGridCell>{flavor.description}</DataGridCell>
            </DataGridRow>
          )}

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>Public</Trans>
            </DataGridCell>
            <DataGridCell>{flavor["os-flavor-access:is_public"] ? <Trans>Yes</Trans> : <Trans>No</Trans>}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>Disabled</Trans>
            </DataGridCell>
            <DataGridCell>{flavor["OS-FLV-DISABLED:disabled"] ? <Trans>Yes</Trans> : <Trans>No</Trans>}</DataGridCell>
          </DataGridRow>
        </DataGrid>
      </Stack>

      {/* Hardware Specifications */}
      <Stack direction="vertical" gap="2">
        <h3 className="text-lg font-semibold text-theme-highest">
          <Trans>Hardware Specifications</Trans>
        </h3>
        <DataGrid columns={2}>
          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>VCPUs</Trans>
            </DataGridCell>
            <DataGridCell>{flavor.vcpus}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>RAM</Trans>
            </DataGridCell>
            <DataGridCell>{formatBytes(flavor.ram, "MiB")}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>Disk</Trans>
            </DataGridCell>
            <DataGridCell>{formatBytes(flavor.disk, "GiB")}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>Ephemeral Disk</Trans>
            </DataGridCell>
            <DataGridCell>{formatBytes(flavor["OS-FLV-EXT-DATA:ephemeral"] || 0, "GiB")}</DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>Swap</Trans>
            </DataGridCell>
            <DataGridCell>
              {flavor.swap === 0 || flavor.swap === "" ? <Trans>None</Trans> : formatBytes(Number(flavor.swap), "MiB")}
            </DataGridCell>
          </DataGridRow>

          <DataGridRow>
            <DataGridCell className="font-medium">
              <Trans>RX/TX Factor</Trans>
            </DataGridCell>
            <DataGridCell>{flavor.rxtx_factor}</DataGridCell>
          </DataGridRow>
        </DataGrid>
      </Stack>

      {/* Extra Specs */}
      {flavor.extra_specs && Object.keys(flavor.extra_specs).length > 0 && (
        <Stack direction="vertical" gap="2">
          <h3 className="text-lg font-semibold text-theme-highest">
            <Trans>Extra Specs</Trans>
          </h3>
          <DataGrid columns={2}>
            {Object.entries(flavor.extra_specs).map(([key, value]) => (
              <DataGridRow key={key}>
                <DataGridCell className="font-medium">{key}</DataGridCell>
                <DataGridCell>{value}</DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        </Stack>
      )}
    </Stack>
  )
}

import { Stack, ContentHeading } from "@cloudoperators/juno-ui-components/index"
import { Trans, useLingui } from "@lingui/react/macro"
import type { Flavor } from "@/server/Compute/types/flavor"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"

interface FlavorDetailsViewProps {
  flavor: Flavor
}

export function FlavorDetailsView({ flavor }: FlavorDetailsViewProps) {
  const { t } = useLingui()
  const formatWithUnit = (value: number, unit: string) => `${value} ${unit}`

  const basicInfoItems = [
    { label: t`ID`, value: <ClipboardText text={flavor.id} /> },
    { label: t`Name`, value: flavor.name },
    { label: t`Description`, value: flavor?.description ?? "" },
    {
      label: t`Public`,
      value: flavor["os-flavor-access:is_public"] ? <Trans>Yes</Trans> : <Trans>No</Trans>,
    },
    {
      label: t`Disabled`,
      value: flavor["OS-FLV-DISABLED:disabled"] ? <Trans>Yes</Trans> : <Trans>No</Trans>,
    },
  ]

  const hardwareSpecItems = [
    { label: t`VCPUs`, value: flavor.vcpus },
    { label: t`RAM`, value: formatWithUnit(flavor.ram, "MiB") },
    { label: t`Disk`, value: formatWithUnit(flavor.disk, "GiB") },
    {
      label: t`Ephemeral Disk`,
      value: formatWithUnit(flavor["OS-FLV-EXT-DATA:ephemeral"] || 0, "GiB"),
    },
    {
      label: t`Swap`,
      value: flavor.swap === 0 || flavor.swap === "" ? <Trans>None</Trans> : formatWithUnit(Number(flavor.swap), "MiB"),
    },
    { label: t`RX/TX Factor`, value: flavor.rxtx_factor ?? "" },
  ]

  const extraSpecItems = flavor.extra_specs
    ? Object.entries(flavor.extra_specs).map(([key, value]) => ({ label: key, value }))
    : []

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <Stack direction="vertical" gap="2">
        <ContentHeading>
          <Trans>Basic Information</Trans>
        </ContentHeading>
        <TwoColumnDescriptionList items={basicInfoItems} />
      </Stack>

      <Stack direction="vertical" gap="2">
        <ContentHeading>
          <Trans>Hardware Specifications</Trans>
        </ContentHeading>
        <TwoColumnDescriptionList items={hardwareSpecItems} />
      </Stack>

      {flavor.extra_specs && Object.keys(flavor.extra_specs).length > 0 && (
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Extra Specs</Trans>
          </ContentHeading>
          <TwoColumnDescriptionList items={extraSpecItems} />
        </Stack>
      )}
    </Stack>
  )
}

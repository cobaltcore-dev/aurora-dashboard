import {
  Stack,
  ContentHeading,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Status,
} from "@cloudoperators/juno-ui-components/index"
import { Trans, useLingui } from "@lingui/react/macro"
import { Fragment } from "react"
import type { Flavor } from "@/server/Compute/types/flavor"
import ClipboardText from "@/client/components/ClipboardText"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"

interface FlavorDetailsViewProps {
  flavor: Flavor
  canListSpecs?: boolean
}

export function FlavorDetailsView({ flavor, canListSpecs = false }: FlavorDetailsViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const formatWithUnit = (value: number, unit: string) => `${value} ${unit}`

  const {
    data: extraSpecs,
    isLoading,
    isError,
  } = trpcReact.compute.getExtraSpecs.useQuery(
    {
      project_id: projectId,
      flavorId: flavor.id,
    },
    {
      enabled: !!projectId && !!flavor.id && canListSpecs,
    }
  )

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
    { label: t`Root Disk`, value: formatWithUnit(flavor.disk, "GiB") },
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

  const extraSpecItems = extraSpecs ? Object.entries(extraSpecs).map(([key, value]) => ({ label: key, value })) : []

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <Stack direction="horizontal" gap="6" className="grid grid-cols-2">
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Flavor Information</Trans>
          </ContentHeading>
          <DescriptionList alignTerms="right">
            {basicInfoItems.map(({ label, value }, index) => (
              <Fragment key={`basic-${index}`}>
                <DescriptionTerm>{label}</DescriptionTerm>
                <DescriptionDefinition>
                  <div className="truncate">{value}</div>
                </DescriptionDefinition>
              </Fragment>
            ))}
          </DescriptionList>
        </Stack>

        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Hardware Specifications</Trans>
          </ContentHeading>
          <DescriptionList alignTerms="right">
            {hardwareSpecItems.map(({ label, value }, index) => (
              <Fragment key={`hardware-${index}`}>
                <DescriptionTerm>{label}</DescriptionTerm>
                <DescriptionDefinition>
                  <div className="truncate">{value}</div>
                </DescriptionDefinition>
              </Fragment>
            ))}
          </DescriptionList>
        </Stack>
      </Stack>

      {canListSpecs && (
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Metadata</Trans>
          </ContentHeading>
          {isLoading ? (
            <Status status="progress" />
          ) : isError ? (
            <Status status="error" title={t`Failed to load metadata`} />
          ) : extraSpecs && Object.keys(extraSpecs).length > 0 ? (
            <DescriptionList alignTerms="right" className="grid-cols-2">
              {extraSpecItems.map(({ label, value }, index) => (
                <Fragment key={`extra-${index}`}>
                  <DescriptionTerm className="col-span-1">{label}</DescriptionTerm>
                  <DescriptionDefinition className="col-span-1">
                    <div className="truncate">{value}</div>
                  </DescriptionDefinition>
                </Fragment>
              ))}
            </DescriptionList>
          ) : (
            <Status status="empty" title={t`No Metadata Properties Found`} />
          )}
        </Stack>
      )}
    </Stack>
  )
}

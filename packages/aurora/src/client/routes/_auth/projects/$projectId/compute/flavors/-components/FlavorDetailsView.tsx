import {
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  Status,
} from "@cloudoperators/juno-ui-components/index"
import { Trans, useLingui } from "@lingui/react/macro"
import { Fragment, type ReactNode } from "react"
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
  const displayValue = (value: ReactNode) =>
    value == null || (typeof value === "string" && !value.trim()) ? "- -" : value
  const formatWithUnit = (value: number | undefined, unit: string) => (value == null ? "- -" : `${value} ${unit}`)
  const formatBoolean = (value: boolean | undefined) =>
    value == null ? "- -" : value ? <Trans>Yes</Trans> : <Trans>No</Trans>

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
    { label: t`ID`, value: flavor.id.trim() ? <ClipboardText text={flavor.id} /> : "- -" },
    { label: t`Name`, value: flavor.name },
    { label: t`Description`, value: flavor.description },
    {
      label: t`Public`,
      value: formatBoolean(flavor["os-flavor-access:is_public"]),
    },
    {
      label: t`Disabled`,
      value: formatBoolean(flavor["OS-FLV-DISABLED:disabled"]),
    },
  ]

  const hardwareSpecItems = [
    { label: t`VCPUs`, value: flavor.vcpus },
    { label: t`RAM`, value: formatWithUnit(flavor.ram, "MiB") },
    { label: t`Root Disk`, value: formatWithUnit(flavor.disk, "GiB") },
    {
      label: t`Ephemeral Disk`,
      value: formatWithUnit(flavor["OS-FLV-EXT-DATA:ephemeral"], "GiB"),
    },
    {
      label: t`Swap`,
      value:
        flavor.swap == null || (typeof flavor.swap === "string" && !flavor.swap.trim()) ? (
          "- -"
        ) : Number(flavor.swap) === 0 ? (
          <Trans>None</Trans>
        ) : (
          formatWithUnit(Number(flavor.swap), "MiB")
        ),
    },
    { label: t`RX/TX Factor`, value: flavor.rxtx_factor },
  ]

  const extraSpecItems = extraSpecs ? Object.entries(extraSpecs).map(([key, value]) => ({ label: key, value })) : []

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <Stack direction="horizontal" gap="6" className="grid grid-cols-2">
        <Stack direction="vertical" gap="2">
          <h2>
            <Trans>Flavor Information</Trans>
          </h2>
          <DescriptionList alignTerms="right">
            {basicInfoItems.map(({ label, value }, index) => (
              <Fragment key={`basic-${index}`}>
                <DescriptionTerm>{label}</DescriptionTerm>
                <DescriptionDefinition>
                  <div className="truncate">{displayValue(value)}</div>
                </DescriptionDefinition>
              </Fragment>
            ))}
          </DescriptionList>
        </Stack>

        <Stack direction="vertical" gap="2">
          <h2>
            <Trans>Hardware Specifications</Trans>
          </h2>
          <DescriptionList alignTerms="right">
            {hardwareSpecItems.map(({ label, value }, index) => (
              <Fragment key={`hardware-${index}`}>
                <DescriptionTerm>{label}</DescriptionTerm>
                <DescriptionDefinition>
                  <div className="truncate">{displayValue(value)}</div>
                </DescriptionDefinition>
              </Fragment>
            ))}
          </DescriptionList>
        </Stack>
      </Stack>

      {canListSpecs && (
        <Stack direction="vertical" gap="2">
          <h2>
            <Trans>Metadata</Trans>
          </h2>
          {isLoading ? (
            <Status status="progress" />
          ) : isError ? (
            <Status status="error" title={t`Failed to Load Metadata`} />
          ) : extraSpecs && Object.keys(extraSpecs).length > 0 ? (
            <DescriptionList alignTerms="right" className="grid-cols-2">
              {extraSpecItems.map(({ label, value }, index) => (
                <Fragment key={`extra-${index}`}>
                  <DescriptionTerm className="col-span-1 break-all">{label}</DescriptionTerm>
                  <DescriptionDefinition className="col-span-1">
                    <div className="break-all">{displayValue(value)}</div>
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

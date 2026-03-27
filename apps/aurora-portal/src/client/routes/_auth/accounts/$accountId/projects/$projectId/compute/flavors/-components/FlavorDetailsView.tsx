import React from "react"
import {
  Stack,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
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
        <DescriptionList alignTerms="right">
          <DescriptionTerm>
            <Trans>ID</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{flavor.id}</DescriptionDefinition>

          <DescriptionTerm>
            <Trans>Name</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{flavor.name}</DescriptionDefinition>

          {flavor.description ? (
            <div>
              <DescriptionTerm>
                <Trans>Description</Trans>
              </DescriptionTerm>
              <DescriptionDefinition>{flavor.description}</DescriptionDefinition>
            </div>
          ) : (
            <div />
          )}

          <DescriptionTerm>
            <Trans>Public</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>
            {flavor["os-flavor-access:is_public"] ? <Trans>Yes</Trans> : <Trans>No</Trans>}
          </DescriptionDefinition>

          <DescriptionTerm>
            <Trans>Disabled</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>
            {flavor["OS-FLV-DISABLED:disabled"] ? <Trans>Yes</Trans> : <Trans>No</Trans>}
          </DescriptionDefinition>
        </DescriptionList>
      </Stack>

      <Stack direction="vertical" gap="2">
        <ContentHeading>
          <Trans>Hardware Specifications</Trans>
        </ContentHeading>
        <DescriptionList alignTerms="right">
          <DescriptionTerm>
            <Trans>VCPUs</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{flavor.vcpus}</DescriptionDefinition>

          <DescriptionTerm>
            <Trans>RAM</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{formatBytes(flavor.ram, "MiB")}</DescriptionDefinition>

          <DescriptionTerm>
            <Trans>Disk</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{formatBytes(flavor.disk, "GiB")}</DescriptionDefinition>

          <DescriptionTerm>
            <Trans>Ephemeral Disk</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{formatBytes(flavor["OS-FLV-EXT-DATA:ephemeral"] || 0, "GiB")}</DescriptionDefinition>

          <DescriptionTerm>
            <Trans>Swap</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>
            {flavor.swap === 0 || flavor.swap === "" ? <Trans>None</Trans> : formatBytes(Number(flavor.swap), "MiB")}
          </DescriptionDefinition>

          <DescriptionTerm>
            <Trans>RX/TX Factor</Trans>
          </DescriptionTerm>
          <DescriptionDefinition>{flavor.rxtx_factor}</DescriptionDefinition>
        </DescriptionList>
      </Stack>

      {flavor.extra_specs && Object.keys(flavor.extra_specs).length > 0 && (
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Extra Specs</Trans>
          </ContentHeading>
          <DescriptionList alignTerms="right">
            {Object.entries(flavor.extra_specs).map(([key, value]) => (
              <React.Fragment key={key}>
                <DescriptionTerm>{key}</DescriptionTerm>
                <DescriptionDefinition>{value}</DescriptionDefinition>
              </React.Fragment>
            ))}
          </DescriptionList>
        </Stack>
      )}
    </Stack>
  )
}

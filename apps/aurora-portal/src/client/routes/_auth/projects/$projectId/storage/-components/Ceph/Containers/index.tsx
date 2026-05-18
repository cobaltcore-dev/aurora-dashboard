import { Trans } from "@lingui/react/macro"
import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { ContainerListView } from "./ContainerListView"
import { ServiceInfoTooltip } from "../ServiceInfo/ServiceInfoTooltip"

export { ContainerListView } from "./ContainerListView"
export { CredentialPrompt } from "./CredentialPrompt"

/**
 * Ceph Containers Page Component
 *
 * Main container page for Ceph/S3 object storage.
 * Displays list of containers (buckets) with usage information.
 */
export const CephContainers = () => {
  return (
    <Stack direction="vertical" gap="4">
      <Stack direction="horizontal" distribution="between" alignment="center">
        <ContentHeading>
          <Trans>Containers</Trans>
        </ContentHeading>
        <ServiceInfoTooltip />
      </Stack>
      <ContainerListView />
    </Stack>
  )
}

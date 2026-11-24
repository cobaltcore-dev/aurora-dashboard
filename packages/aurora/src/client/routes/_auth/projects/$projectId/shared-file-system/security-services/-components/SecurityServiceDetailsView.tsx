import { Trans } from "@lingui/react/macro"
import { Stack } from "@cloudoperators/juno-ui-components"
import { StatusLabel } from "@/client/components/StatusLabel"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { getSecurityServiceTypeLabel } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/securityServiceUtils"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"

interface SecurityServiceDetailsViewProps {
  securityService: SecurityService
}

export function SecurityServiceDetailsView({ securityService }: SecurityServiceDetailsViewProps) {
  const { id, name, type, status, dns_ip, server, domain, user, ou, description, created_at, updated_at } =
    securityService

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <TwoColumnDescriptionList
        items={[
          { label: <Trans>Name</Trans>, value: name },
          {
            label: <Trans>ID</Trans>,
            value: <ClipboardText text={id} />,
          },
          {
            label: <Trans>Type</Trans>,
            value: getSecurityServiceTypeLabel(type),
          },
          {
            label: <Trans>Status</Trans>,
            value: status ? <StatusLabel value={status} /> : undefined,
          },
          { label: <Trans>DNS IP</Trans>, value: dns_ip },
          { label: <Trans>Server</Trans>, value: server },
          { label: <Trans>Domain</Trans>, value: domain },
          { label: <Trans>User</Trans>, value: user },
          { label: <Trans>Organizational Unit</Trans>, value: ou },
          { label: <Trans>Description</Trans>, value: description },
          {
            label: <Trans>Created</Trans>,
            value: parseManilaTimestamp(created_at)?.toLocaleString(),
          },
          {
            label: <Trans>Updated</Trans>,
            value: parseManilaTimestamp(updated_at)?.toLocaleString(),
          },
        ]}
      />
    </Stack>
  )
}

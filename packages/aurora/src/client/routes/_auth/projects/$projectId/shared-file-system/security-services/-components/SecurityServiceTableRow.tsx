import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Stack,
} from "@cloudoperators/juno-ui-components"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import { StatusLabel } from "@/client/components/StatusLabel"
import { getSecurityServiceTypeLabel } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/securityServiceUtils"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"

interface SecurityServiceTableRowProps {
  securityService: SecurityService
}

export const SecurityServiceTableRow = ({ securityService }: SecurityServiceTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const navigateToDetailsPage = () => {
    navigate({
      to: "/projects/$projectId/shared-file-system/security-services/$securityServiceId",
      params: { projectId, securityServiceId: securityService.id },
    })
  }

  // Type
  const typeLabel = getSecurityServiceTypeLabel(securityService.type) ?? EMPTY_VALUE

  // Created
  const createdDate = parseManilaTimestamp(securityService.created_at)
  const createdLabel = createdDate?.toLocaleString() ?? EMPTY_VALUE

  return (
    <DataGridRow data-testid={`security-service-row-${securityService.id}`} onClick={navigateToDetailsPage}>
      {/* Status */}
      <DataGridCell>
        <StatusLabel value={securityService.status} />
      </DataGridCell>

      {/* Name / ID */}
      <DataGridCell>
        <Stack direction="vertical" gap="0.5" className="min-w-0">
          {securityService.name ? (
            <>
              <span className="break-all">{securityService.name}</span>
              <ClipboardText text={securityService.id} className="text-theme-light text-sm" truncateAt={13} />
            </>
          ) : (
            <ClipboardText text={securityService.id} truncateAt={13} />
          )}
        </Stack>
      </DataGridCell>

      {/* Type */}
      <DataGridCell>{typeLabel}</DataGridCell>

      {/* DNS IP */}
      <DataGridCell>
        <span className="break-all">{securityService.dns_ip ?? EMPTY_VALUE}</span>
      </DataGridCell>

      {/* Server */}
      <DataGridCell>
        <span className="break-all">{securityService.server ?? EMPTY_VALUE}</span>
      </DataGridCell>

      {/* Created */}
      <DataGridCell>{createdLabel}</DataGridCell>

      {/* Actions */}
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem
              label={t`Show Details`}
              onClick={(e) => {
                e.stopPropagation()
                navigateToDetailsPage()
              }}
            />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

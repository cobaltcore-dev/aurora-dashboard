import { useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { useProjectId } from "@/client/hooks"
import ClipboardText from "@/client/components/ClipboardText"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import {
  getSecurityServiceTypeLabel,
  sortSecurityServices,
} from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/securityServiceUtils"

const COLUMN_COUNT = 3

interface ShareNetworkSecurityServicesTableProps {
  securityServices: SecurityService[]
  isLoading: boolean
  error: { message?: string; data?: { code?: string } | null } | null
  canList: boolean
  onRetry: () => void
}

interface SecurityServiceRowProps {
  securityService: SecurityService
}

const SecurityServiceRow = ({ securityService }: SecurityServiceRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const navigateToSecurityService = () => {
    navigate({
      to: "/projects/$projectId/shared-file-system/security-services/$securityServiceId",
      params: { projectId, securityServiceId: securityService.id },
    })
  }

  const typeLabel = getSecurityServiceTypeLabel(securityService.type) ?? EMPTY_VALUE

  return (
    <DataGridRow
      data-testid={`share-network-security-service-row-${securityService.id}`}
      onClick={navigateToSecurityService}
    >
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

      {/* Actions */}
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem
              label={t`Show Details`}
              onClick={(e) => {
                e.stopPropagation()
                navigateToSecurityService()
              }}
            />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

export const ShareNetworkSecurityServicesTable = ({
  securityServices,
  isLoading,
  error,
  canList,
  onRetry,
}: ShareNetworkSecurityServicesTableProps) => {
  const { t } = useLingui()

  return (
    <Stack direction="vertical" className="juno-pattern-datagrid-outer">
      <DataGrid
        columns={COLUMN_COUNT}
        minContentColumns={[2]}
        cellVerticalAlignment="top"
        data-testid="share-network-security-services-table"
      >
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name / ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Type</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {/* DT-7: State rows */}
        {!canList || error?.data?.code === "FORBIDDEN" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Access Denied`}
                body={t`You don't have permission to view the security services of this share network.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : isLoading ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status status="progress" title={t`Loading Security Services...`} />
            </DataGridCell>
          </DataGridRow>
        ) : error?.data?.code === "UNAUTHORIZED" ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Session Expired`}
                body={t`Your session has expired. Sign in again to view security services.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : error ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="error"
                title={t`Failed to Load Security Services`}
                body={t`The security services could not be loaded.`}
                action={<Button size="xs" label={t`Try Again`} onClick={onRetry} />}
              />
            </DataGridCell>
          </DataGridRow>
        ) : securityServices.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="empty"
                title={t`No Security Services`}
                body={t`This share network has no security services.`}
              />
            </DataGridCell>
          </DataGridRow>
        ) : (
          sortSecurityServices(securityServices).map((service) => (
            <SecurityServiceRow key={service.id} securityService={service} />
          ))
        )}
      </DataGrid>
    </Stack>
  )
}

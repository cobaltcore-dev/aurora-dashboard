import { Server } from "@/server/Compute/types/server"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuOptions,
  PopupMenuItem,
  Status,
  Pagination,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { powerStateLabel, EMPTY_VALUE } from "../-utils/instanceDisplay"
import { FlavorLink } from "./FlavorLink"
import { StatusLabel } from "@/client/components/StatusLabel"
import { NameIdCell } from "@/client/components/NameIdCell"

const COLUMN_COUNT = 6

/**
 * Instance status with contextual detail revealed as a tooltip on hover/focus:
 * the fault message when the instance is in an error state, otherwise the power state.
 * `open` is controlled so the tooltip behaves predictably (floating-ui's uncontrolled
 * hover does not fire reliably under jsdom).
 */
const StatusWithTooltip = ({
  status,
  powerState,
  fault,
}: {
  status: string | null | undefined
  powerState: string
  fault?: string | null
}) => {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)

  const faultMessage = fault?.trim()
  const tooltip = faultMessage ? t`Error: ${faultMessage}` : powerState ? t`Power State: ${powerState}` : null

  if (!tooltip) return <StatusLabel value={status} />

  return (
    <Tooltip triggerEvent="hover" open={open}>
      <TooltipTrigger
        className="w-fit"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <StatusLabel value={status} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

interface InstanceListViewProps {
  instances: Server[]
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export const InstanceListView = ({
  instances,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: InstanceListViewProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [inputPage, setInputPage] = useState<string>(currentPage.toString())

  useEffect(() => {
    setInputPage(currentPage.toString())
  }, [currentPage])

  const { projectId } = useParams({ from: "/_auth/projects/$projectId/compute/instances/" })

  const goToDetail = (instanceId: string) =>
    navigate({
      to: "/projects/$projectId/compute/instances/$instanceId",
      params: { projectId, instanceId },
    })

  const updateCurrentPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange?.(newPage)
      setInputPage(newPage.toString())
    }
  }

  return (
    <>
      <DataGrid
        columns={COLUMN_COUNT}
        minContentColumns={[COLUMN_COUNT - 1]}
        className="instances"
        data-testid="instances-table"
      >
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Status</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Name / ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Flavor</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Availability Zone</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Created</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {instances.length > 0 ? (
          instances.map((instance) => {
            return (
              <DataGridRow
                key={instance.id}
                data-testid={`instance-row-${instance.id}`}
                onClick={() => goToDetail(instance.id)}
              >
                <DataGridCell>
                  <StatusWithTooltip
                    status={instance.status}
                    powerState={powerStateLabel(instance["OS-EXT-STS:power_state"])}
                    fault={instance.fault?.message}
                  />
                </DataGridCell>
                <DataGridCell>
                  <NameIdCell name={instance.name} id={instance.id} />
                </DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()}>
                  <FlavorLink instance={instance} projectId={projectId} />
                </DataGridCell>
                <DataGridCell>{instance["OS-EXT-AZ:availability_zone"] || EMPTY_VALUE}</DataGridCell>
                <DataGridCell>{instance.created || EMPTY_VALUE}</DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()}>
                  <PopupMenu>
                    <PopupMenuOptions>
                      <PopupMenuItem label={t`View details`} onClick={() => goToDetail(instance.id)} />
                    </PopupMenuOptions>
                  </PopupMenu>
                </DataGridCell>
              </DataGridRow>
            )
          })
        ) : (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="empty"
                title={t`No instances found`}
                body={t`There are no instances in this project with the current filters applied. Try adjusting your search or filter criteria.`}
              />
            </DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
      {totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination
            variant="input"
            currentPage={currentPage}
            pages={totalPages}
            onPressPrevious={() => updateCurrentPage(Math.max(currentPage - 1, 1))}
            onPressNext={() => updateCurrentPage(Math.min(currentPage + 1, totalPages))}
            onSelectChange={(selectedPage: number) => {
              updateCurrentPage(selectedPage)
            }}
            onInputChange={(newInputPage?: number) => {
              setInputPage(newInputPage === undefined ? "" : String(newInputPage))
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && inputPage !== "") {
                const newPage = parseInt(inputPage, 10)
                if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                  updateCurrentPage(newPage)
                }
              }
            }}
          />
        </div>
      )}
    </>
  )
}

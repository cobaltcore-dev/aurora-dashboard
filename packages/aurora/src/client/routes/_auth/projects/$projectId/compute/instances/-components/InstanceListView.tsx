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
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { rawImageId, powerStateLabel, EMPTY_VALUE } from "../-utils/instanceDisplay"
import { ImageNameHover } from "./ImageNameHover"
import { FlavorLink } from "./FlavorLink"

const COLUMN_COUNT = 7

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
      <DataGrid columns={COLUMN_COUNT} minContentColumns={[6]} className="instances" data-testid="instances-table">
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Power State</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Flavor</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Image ID</Trans>
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
                <DataGridCell>{powerStateLabel(instance["OS-EXT-STS:power_state"]) || EMPTY_VALUE}</DataGridCell>
                <DataGridCell>{instance.name || instance.id}</DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()}>
                  <FlavorLink instance={instance} projectId={projectId} />
                </DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()}>
                  {rawImageId(instance) ? (
                    <ImageNameHover imageId={rawImageId(instance)} projectId={projectId} />
                  ) : (
                    EMPTY_VALUE
                  )}
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

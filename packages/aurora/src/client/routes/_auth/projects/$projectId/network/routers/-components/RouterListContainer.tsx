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
import { useParams, useNavigate, useLoaderData } from "@tanstack/react-router"
import type { RouterListItem } from "@/server/Network/types/router"

interface RouterListContainerProps {
  routers?: RouterListItem[]
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

/** Primary value on top, secondary (usually an ID) below in a lighter color. */
const TwoLineCell = ({ primary, secondary }: { primary: string; secondary?: string }) => (
  <div className="flex min-w-0 flex-col">
    <span className="break-all">{primary}</span>
    {secondary && <span className="text-theme-light text-sm break-all">{secondary}</span>}
  </div>
)

export const RouterListContainer = ({
  routers,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: RouterListContainerProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [inputPage, setInputPage] = useState<string>(currentPage.toString())

  useEffect(() => {
    setInputPage(currentPage.toString())
  }, [currentPage])

  const { projectId } = useParams({
    from: "/_auth/projects/$projectId/network/routers/",
  })

  // Routers are listed for the current project, so its name can be shown next to the ID
  const { crumbProject } = useLoaderData({ from: "/_auth/projects/$projectId" })

  const openDetails = (router: RouterListItem) =>
    navigate({
      to: "/projects/$projectId/network/routers/$routerId",
      params: { projectId, routerId: router.id },
    })

  const updateCurrentPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange?.(newPage)
      setInputPage(newPage.toString())
    }
  }

  return (
    <>
      <DataGrid columns={7} minContentColumns={[6]} className="routers" data-testid="routers-table">
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Project</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>External Network</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>External Subnet</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Private Network</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Status</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {routers && routers.length > 0 ? (
          routers.map((router) => {
            const gateway = router.external_gateway_info
            const projectName = router.project_id === projectId ? crumbProject?.name : undefined

            return (
              <DataGridRow key={router.id} data-testid={`router-row-${router.id}`} onClick={() => openDetails(router)}>
                <DataGridCell>
                  <TwoLineCell primary={router.name || router.id} secondary={router.name ? router.id : undefined} />
                </DataGridCell>
                <DataGridCell>
                  <TwoLineCell
                    primary={projectName || router.project_id}
                    secondary={projectName ? router.project_id : undefined}
                  />
                </DataGridCell>
                <DataGridCell>
                  {gateway ? (
                    <TwoLineCell
                      primary={gateway.network_name || gateway.network_id}
                      secondary={gateway.network_name ? gateway.network_id : undefined}
                    />
                  ) : (
                    "–"
                  )}
                </DataGridCell>
                <DataGridCell>
                  {gateway?.external_fixed_ips && gateway.external_fixed_ips.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {gateway.external_fixed_ips.map((fixedIp) => (
                        <TwoLineCell
                          key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`}
                          primary={fixedIp.ip_address}
                          secondary={fixedIp.subnet_name || fixedIp.subnet_id}
                        />
                      ))}
                    </div>
                  ) : (
                    "–"
                  )}
                </DataGridCell>
                <DataGridCell>
                  {router.private_networks && router.private_networks.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {router.private_networks.map((privateNetwork) => (
                        <TwoLineCell
                          key={privateNetwork.network_id}
                          primary={privateNetwork.network_name || privateNetwork.network_id}
                          secondary={privateNetwork.network_name ? privateNetwork.network_id : undefined}
                        />
                      ))}
                    </div>
                  ) : (
                    "–"
                  )}
                </DataGridCell>
                <DataGridCell>{router.status}</DataGridCell>
                <DataGridCell onClick={(e) => e.stopPropagation()}>
                  <PopupMenu>
                    <PopupMenuOptions>
                      <PopupMenuItem label={t`Show Details`} onClick={() => openDetails(router)} />
                    </PopupMenuOptions>
                  </PopupMenu>
                </DataGridCell>
              </DataGridRow>
            )
          })
        ) : (
          <DataGridRow>
            <DataGridCell colSpan={7}>
              <Status
                status="empty"
                title={t`No routers found`}
                body={t`There are no routers available for this project with the current filters applied. Try adjusting your filter criteria.`}
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

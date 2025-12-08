import { Flavor } from "@/server/Compute/types/flavor"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  PopupMenu,
  PopupMenuOptions,
  PopupMenuItem,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react/macro"
import { DeleteFlavorModal } from "./DeleteFlavorModal"
import { useState } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { EditSpecModal } from "./EditSpecModal"
import { ManageAccessModal } from "./ManageAccessModal"
import { Link, useParams } from "@tanstack/react-router"

interface FlavorListContainerProps {
  flavors?: Flavor[]
  isLoading: boolean
  client: TrpcClient
  project: string
  onFlavorDeleted?: (flavorName: string) => void
  canDeleteFlavor?: boolean
  canMangageAccess?: boolean
}

export const FlavorListContainer = ({
  flavors,
  isLoading,
  client,
  project,
  onFlavorDeleted,
  canDeleteFlavor,
  canMangageAccess,
}: FlavorListContainerProps) => {
  const { t } = useLingui()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [specModalOpen, setSpecModalOpen] = useState(false)
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)

  const { accountId, projectId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
  })

  const openDeleteModal = (flavor: Flavor) => {
    setSelectedFlavor(flavor)
    setDeleteModalOpen(true)
  }

  const openSpecModal = (flavor: Flavor) => {
    setSelectedFlavor(flavor)
    setSpecModalOpen(true)
  }

  const openAccessModal = (flavor: Flavor) => {
    setSelectedFlavor(flavor)
    setAccessModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setSelectedFlavor(null)
  }

  const handleDeleteSuccess = () => {
    if (selectedFlavor && onFlavorDeleted) {
      onFlavorDeleted(selectedFlavor.name || "")
    }
    closeDeleteModal()
  }

  if (isLoading) {
    return (
      <div data-testid="loading">
        <div data-testid="loading">
          <DataGridRow>
            <DataGridCell colSpan={3}>
              <Stack distribution="center" alignment="center">
                <Spinner variant="primary" />
                <Trans>Loading...</Trans>
              </Stack>
            </DataGridCell>
          </DataGridRow>
        </div>
      </div>
    )
  }

  if (!flavors || flavors.length === 0) {
    return (
      <DataGrid columns={7} className="flavors" data-testid="no-flavors">
        <DataGridRow>
          <DataGridCell colSpan={7}>
            <ContentHeading>
              <Trans>No flavors found</Trans>
            </ContentHeading>
            <p>
              <Trans>
                There are no flavors available for this project with the current filters applied. Try adjusting your
                filter criteria or create a new flavor.
              </Trans>
            </p>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <>
      <DataGrid columns={6} minContentColumns={[5]} className="flavors" data-testid="flavors-table">
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>vCPU</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>RAM (MiB)</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Root Disk (GiB)</Trans>
          </DataGridHeadCell>

          <DataGridHeadCell>
            <Trans>Swap (MiB)</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {flavors.map((flavor) => (
          <DataGridRow key={flavor.id} data-testid={`flavor-row-${flavor.id}`}>
            <DataGridCell>
              <Link
                to="/accounts/$accountId/projects/$projectId/compute/flavors/$flavorId"
                params={{ projectId: projectId, accountId: accountId, flavorId: flavor.id }}
                className="text-theme-default hover:text-theme-link"
              >
                {flavor.name || flavor.id}
              </Link>
            </DataGridCell>
            <DataGridCell>{flavor.vcpus || "–"}</DataGridCell>
            <DataGridCell>{flavor.ram || "–"}</DataGridCell>
            <DataGridCell>{flavor.disk || "–"}</DataGridCell> <DataGridCell>{flavor.swap || "–"}</DataGridCell>
            <DataGridCell>
              <PopupMenu>
                <PopupMenuOptions>
                  <PopupMenuItem>
                    <Link
                      to="/accounts/$accountId/projects/$projectId/compute/flavors/$flavorId"
                      params={{ projectId: projectId, accountId: accountId, flavorId: flavor.id }}
                      className="text-theme-default "
                    >
                      {t`Details`}
                    </Link>
                  </PopupMenuItem>
                  <PopupMenuItem label={t`Metadata`} onClick={() => openSpecModal(flavor)} />

                  {canMangageAccess && (
                    <PopupMenuItem label={t`Manage Access`} onClick={() => openAccessModal(flavor)} />
                  )}
                  {canDeleteFlavor && (
                    <PopupMenuItem label={t`Delete Flavor`} onClick={() => openDeleteModal(flavor)} />
                  )}
                </PopupMenuOptions>
              </PopupMenu>
            </DataGridCell>
          </DataGridRow>
        ))}
      </DataGrid>
      <DeleteFlavorModal
        client={client}
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        project={project}
        flavor={selectedFlavor}
        onSuccess={handleDeleteSuccess}
      />
      <EditSpecModal
        client={client}
        isOpen={specModalOpen}
        onClose={() => setSpecModalOpen(false)}
        project={project}
        flavor={selectedFlavor}
      />

      <ManageAccessModal
        client={client}
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        project={project}
        flavor={selectedFlavor}
      />
    </>
  )
}

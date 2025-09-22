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
} from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { DeleteFlavorModal } from "./DeleteFlavorModal"
import { useState } from "react"
import { TrpcClient } from "@/client/trpcClient"

interface FlavorListContainerProps {
  flavors?: Flavor[]
  isLoading: boolean
  client: TrpcClient
  project: string
  onFlavorDeleted?: (flavorName: string) => void
}

export const FlavorListContainer = ({
  flavors,
  isLoading,
  client,
  project,
  onFlavorDeleted,
}: FlavorListContainerProps) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [flavorToDelete, setFlavorToDelete] = useState<Flavor | null>(null)

  const openDeleteModal = (flavor: Flavor) => {
    setFlavorToDelete(flavor)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setFlavorToDelete(null)
  }

  const handleDeleteSuccess = () => {
    if (flavorToDelete && onFlavorDeleted) {
      onFlavorDeleted(flavorToDelete.name || "")
    }
    closeDeleteModal()
  }

  if (isLoading) {
    return (
      <div data-testid="loading">
        <Trans>Loading...</Trans>
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
      <DataGrid columns={8} minContentColumns={[7]} className="flavors" data-testid="flavors-table">
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
            <Trans>Ephemeral Disk (GiB)</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Swap (MiB)</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>RX/TX Factor</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {flavors.map((flavor) => (
          <DataGridRow key={flavor.id} data-testid={`flavor-row-${flavor.id}`}>
            <DataGridCell>{flavor.name || flavor.id}</DataGridCell>
            <DataGridCell>{flavor.vcpus || "–"}</DataGridCell>
            <DataGridCell>{flavor.ram || "–"}</DataGridCell>
            <DataGridCell>{flavor.disk || "–"}</DataGridCell>
            <DataGridCell>{flavor["OS-FLV-EXT-DATA:ephemeral"] || "–"}</DataGridCell>
            <DataGridCell>{flavor.swap || "–"}</DataGridCell>
            <DataGridCell>{flavor.rxtx_factor || "–"}</DataGridCell>

            <DataGridCell>
              <PopupMenu>
                <PopupMenuOptions>
                  <PopupMenuItem label="Extra Specs" icon="info" />
                  <PopupMenuItem icon="deleteForever" label="Delete Flavor" onClick={() => openDeleteModal(flavor)} />
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
        flavor={flavorToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </>
  )
}

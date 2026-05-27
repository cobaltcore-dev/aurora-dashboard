import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { CertificateAuthority } from "@/server/Services/types/pca"
import { useModal } from "@/client/utils/useModal"
import { useProjectId } from "@/client/hooks"
import { DeletePcaModal } from "../-modals/DeletePcaModal"
import { STATE_CONFIG } from "./constants"

interface PcaTableRowProps {
  pca: CertificateAuthority
}

export const PcaTableRow = ({ pca }: PcaTableRowProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const [deletePcaModalOpen, toggleDeletePcaModal] = useModal(false)

  const navigateToDetailsPage = () =>
    navigate({
      to: "/projects/$projectId/services/pca/$pcaId",
      params: { projectId, pcaId: pca.id },
    })

  return (
    <>
      <DataGridRow key={pca.id} data-testid={`pca-row-${pca.id}`} onClick={navigateToDetailsPage}>
        <DataGridCell>
          <div className="flex items-center gap-2">
            {STATE_CONFIG[pca.state].icon}
            {STATE_CONFIG[pca.state].text}
          </div>
        </DataGridCell>
        <DataGridCell>{pca.id}</DataGridCell>
        <DataGridCell>{pca.configuration?.subject?.common_name || "—"}</DataGridCell>
        <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end pr-0">
          <PopupMenu>
            <PopupMenuOptions>
              <PopupMenuItem label={t`Delete CA`} onClick={toggleDeletePcaModal} />
            </PopupMenuOptions>
          </PopupMenu>
        </DataGridCell>
      </DataGridRow>

      {deletePcaModalOpen && <DeletePcaModal pca={pca} open={deletePcaModalOpen} onClose={toggleDeletePcaModal} />}
    </>
  )
}

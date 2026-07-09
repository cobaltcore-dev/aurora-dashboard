import { MdAutorenew, MdCheckCircle, MdHelpOutline, MdHourglassEmpty, MdReportProblem } from "react-icons/md"
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

  const STATE_CONFIG = {
    CREATING: {
      text: t`Creating`,
      icon: <MdAutorenew size={20} color="white" fill="#1976D2" />,
    },
    AWAITING_CERTIFICATE: {
      text: t`Awaiting Certificate`,
      icon: <MdHourglassEmpty size={20} color="white" fill="#FBC02D" />,
    },
    READY: {
      text: t`Ready`,
      icon: <MdCheckCircle size={20} color="white" fill="#4FB81C" />,
    },
    FAILED: {
      text: t`Failed`,
      icon: <MdReportProblem size={20} color="white" fill="#D32F2F" />,
    },
    UNEXPECTED: {
      text: t`Unexpected`,
      icon: <MdHelpOutline size={20} color="white" fill="#757575" />,
    },
  } as const

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
        <DataGridCell>{pca.display_subject || "—"}</DataGridCell>
        <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end pr-0">
          <PopupMenu>
            <PopupMenuOptions>
              <PopupMenuItem label={t`Show Details`} onClick={navigateToDetailsPage} />
              <PopupMenuItem label={t`Delete CA`} onClick={toggleDeletePcaModal} />
            </PopupMenuOptions>
          </PopupMenu>
        </DataGridCell>
      </DataGridRow>

      {deletePcaModalOpen && <DeletePcaModal pca={pca} open={deletePcaModalOpen} onClose={toggleDeletePcaModal} />}
    </>
  )
}

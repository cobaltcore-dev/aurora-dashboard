import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { CertificateAuthority } from "@/server/Services/types/pca"
import { STATE_CONFIG } from "./constants"

interface PcaTableRowProps {
  pca: CertificateAuthority
}

export const PcaTableRow = ({ pca }: PcaTableRowProps) => {
  const { t } = useLingui()

  // TODO: I will uncomment it on get-by-id part of the epic and add onClick={navigateToDetailsPage} to <DataGridRow />
  // const navigate = useNavigate()
  // const projectId = useProjectId()
  // const navigateToDetailsPage = () => {
  //   navigate({
  //     to: "/projects/$projectId/services/pca/$pcaId",
  //     params: { projectId, pcaId: pca.id },
  //   })
  // }

  return (
    <DataGridRow key={pca.id} data-testid={`pca-row-${pca.id}`}>
      <DataGridCell>
        <div className="flex items-center gap-2">
          {STATE_CONFIG[pca.state].icon}
          {STATE_CONFIG[pca.state].text}
        </div>
      </DataGridCell>
      <DataGridCell>{pca.id}</DataGridCell>
      <DataGridCell>{pca.configuration.subject.common_name || "—"}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Delete CA`} disabled />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

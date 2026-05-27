import { useLingui } from "@lingui/react/macro"
import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { Certificate } from "@/server/Services/types/pca"

interface PcaCertificatesTableRowProps {
  certificate: Certificate
}

export const PcaCertificatesTableRow = ({ certificate }: PcaCertificatesTableRowProps) => {
  const { t } = useLingui()

  // I will enable this button on get-by-id certificate task of the EPIC
  // const navigateToDetailsPage = () =>
  //   navigate({
  //     to: "/projects/$projectId/services/pca/$pcaId",
  //     params: { projectId, pcaId: pca.id },
  //   })

  return (
    <DataGridRow key={certificate.id} data-testid={`pca-certificate-row-${certificate.id}`}>
      <DataGridCell>{certificate.certificate_authority_id}</DataGridCell>
      <DataGridCell>{certificate.id}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            {/* I will enable this button on create-certificate task of the EPIC */}
            <PopupMenuItem label={t`Create Certificate`} disabled />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}

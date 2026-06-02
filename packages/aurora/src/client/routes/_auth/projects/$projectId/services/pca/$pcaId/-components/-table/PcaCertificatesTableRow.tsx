import { useNavigate } from "@tanstack/react-router"
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
  const navigate = useNavigate()

  const navigateToCertificateDetailsPage = () =>
    navigate({
      from: "/projects/$projectId/services/pca/$pcaId/",
      to: "$certificateId",
      params: (prev) => ({ ...prev, certificateId: certificate.id }),
    })

  return (
    <DataGridRow
      key={certificate.id}
      data-testid={`pca-certificate-row-${certificate.id}`}
      onClick={navigateToCertificateDetailsPage}
    >
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

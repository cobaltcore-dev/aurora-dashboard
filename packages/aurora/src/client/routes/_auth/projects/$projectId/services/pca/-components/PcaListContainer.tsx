import { Trans, useLingui } from "@lingui/react/macro"
import {
  Stack,
  Spinner,
  DataGrid,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  DataGridHeadCell,
  Button,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { useModal } from "@/client/utils/useModal"
import { TABLE_COLUMNS } from "./-table/constants"
import { PcaTableRow } from "./-table/PcaTableRow"
import { CreatePcaModal } from "./-modals/CreatePcaModal"

export const PcaListContainer = () => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const columns = TABLE_COLUMNS()
  const columnsLength = columns.length
  const [createCaOpen, toggleCreateCa] = useModal(false)

  const { data: pcas = [], isLoading, isError, error } = trpcReact.services.pca.list.useQuery({ project_id: projectId })

  if (isLoading) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading...</Trans>
      </Stack>
    )
  }

  if (isError) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        {error?.message ?? t`Failed to load PCAs`}
      </Stack>
    )
  }

  if (pcas.length === 0) {
    return (
      <DataGrid columns={columnsLength} className="pca" data-testid="no-pcas">
        <DataGridRow>
          <DataGridCell colSpan={columnsLength}>
            <ContentHeading>
              <Trans>No PCAs found</Trans>
            </ContentHeading>
            <p>
              <Trans>There are no PCAs available for this project.</Trans>
            </p>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <div className="relative">
      <Stack className="pt-3 pb-2" distribution="end">
        <Button variant="primary" label={t`Create Certificate Authority`} onClick={toggleCreateCa} />
      </Stack>
      <DataGrid columns={columnsLength}>
        <DataGridRow>
          {columns.map((label) => (
            <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
          ))}
        </DataGridRow>
        {pcas.map((pca) => (
          <PcaTableRow key={pca.id} pca={pca} />
        ))}
      </DataGrid>

      {createCaOpen && <CreatePcaModal open={createCaOpen} onClose={toggleCreateCa} />}
    </div>
  )
}

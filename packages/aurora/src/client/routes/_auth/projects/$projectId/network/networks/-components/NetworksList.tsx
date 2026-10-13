import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  Stack,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridToolbar,
  SearchInput,
  Message,
  Status,
  DataGridHeadCell,
} from "@cloudoperators/juno-ui-components"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { trpcReact } from "@/client/trpcClient"

interface NetworksListProps {
  project: string
}

export const NetworksList = ({ project: projectId }: NetworksListProps) => {
  const { t } = useLingui()
  const [searchTerm, setSearchTerm] = useState("")

  const {
    data: networksData,
    isLoading,
    isError,
    error,
  } = trpcReact.network.networks.list.useQuery(
    {
      project_id: projectId || "",
      searchTerm: searchTerm || undefined,
    },
    {
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev,
    }
  )

  const networks = networksData || []
  const hasSearch = searchTerm.trim().length > 0

  // Check permissions (TODO: implement permission checking)
  const canCreate = true // Placeholder

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleCreateClick = () => {
    // TODO: Open create network modal
    console.log("Create network clicked")
  }

  const handleRowClick = (networkId: string) => {
    // TODO: Navigate to detail page once routes are registered
    console.log("Navigate to network:", networkId)
  }

  const headerActions = canCreate && (
    <Button variant="primary" onClick={handleCreateClick}>
      <Trans>Create Network</Trans>
    </Button>
  )

  if (isLoading) {
    return <Status status="progress" title={t`Loading Networks...`} />
  }

  if (isError) {
    const errorMessage =
      error?.data?.code === "FORBIDDEN"
        ? t`You do not have permission to view networks`
        : error?.message || t`Failed to Load Networks`

    return <Message variant="error">{errorMessage}</Message>
  }

  return (
    <Stack direction="vertical" gap="4">
      <ContentHeader title={t`Networks`} projectId={projectId} actions={headerActions} />

      <DataGridToolbar>
        <SearchInput
          value={searchTerm}
          onSearch={handleSearchChange}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t`Search networks...`}
        />
      </DataGridToolbar>

      <DataGrid columns={5}>
        <DataGridRow>
          <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Admin State`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Shared`}</DataGridHeadCell>
          <DataGridHeadCell>{t`External`}</DataGridHeadCell>
        </DataGridRow>

        {networks.length === 0 ? (
          <DataGridRow>
            <DataGridCell colSpan={5}>
              <Status
                status={hasSearch ? "no-matches" : "empty"}
                title={hasSearch ? t`No Matching Networks` : t`No Networks Found`}
                body={
                  hasSearch
                    ? t`No networks match your search. Clear the search to view all networks.`
                    : t`There are no networks in this project.`
                }
              />
            </DataGridCell>
          </DataGridRow>
        ) : (
          networks.map((network) => (
            <DataGridRow key={network.id} onClick={() => handleRowClick(network.id)} className="cursor-pointer">
              <DataGridCell>
                <span className="text-theme-link">{network.name || network.id}</span>
              </DataGridCell>
              <DataGridCell>{network.status}</DataGridCell>
              <DataGridCell>{network.admin_state_up ? t`Up` : t`Down`}</DataGridCell>
              <DataGridCell>{network.shared ? t`Yes` : t`No`}</DataGridCell>
              <DataGridCell>{network["router:external"] ? t`Yes` : t`No`}</DataGridCell>
            </DataGridRow>
          ))
        )}
      </DataGrid>
    </Stack>
  )
}

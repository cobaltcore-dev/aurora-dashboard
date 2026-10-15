import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate } from "@tanstack/react-router"
import {
  Button,
  Stack,
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridToolbar,
  SearchInput,
  Status,
  DataGridHeadCell,
} from "@cloudoperators/juno-ui-components"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { trpcReact } from "@/client/trpcClient"

interface NetworksListProps {
  project: string
}

const COLUMN_COUNT = 5

export const NetworksList = ({ project: projectId }: NetworksListProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  // Controlled input value is kept separate from the query key, so the list only re-queries
  // when a search is submitted (Enter / search button) instead of on every keystroke.
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const {
    data: networksData,
    isLoading,
    isError,
    error,
    refetch,
  } = trpcReact.network.networks.list.useQuery(
    {
      project_id: projectId,
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

  const handleCreateClick = () => {
    // TODO: Open create network modal
    console.log("Create network clicked")
  }

  const navigateToDetails = (networkId: string) => {
    navigate({
      to: "/projects/$projectId/network/networks/$networkId",
      params: { projectId, networkId },
    })
  }

  const headerActions = canCreate && (
    <Button variant="primary" onClick={handleCreateClick}>
      <Trans>Create Network</Trans>
    </Button>
  )

  const renderBody = () => {
    if (isLoading) {
      return (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            <Status status="progress" title={t`Loading Networks`} />
          </DataGridCell>
        </DataGridRow>
      )
    }

    if (isError) {
      const errorMessage =
        error?.data?.code === "FORBIDDEN"
          ? t`You do not have permission to view networks.`
          : error?.message || t`Failed to Load Networks`
      return (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            <Status
              status="error"
              title={t`Failed to Load Networks`}
              body={errorMessage}
              action={
                <Button onClick={() => refetch()}>
                  <Trans>Try Again</Trans>
                </Button>
              }
            />
          </DataGridCell>
        </DataGridRow>
      )
    }

    if (networks.length === 0) {
      return (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
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
      )
    }

    return networks.map((network) => (
      <DataGridRow key={network.id} onClick={() => navigateToDetails(network.id)} className="cursor-pointer">
        <DataGridCell>
          <span className="break-all">{network.name || network.id}</span>
        </DataGridCell>
        <DataGridCell>{network.status}</DataGridCell>
        <DataGridCell>{network.admin_state_up ? t`Up` : t`Down`}</DataGridCell>
        <DataGridCell>{network.shared ? t`Yes` : t`No`}</DataGridCell>
        <DataGridCell>{network["router:external"] ? t`Yes` : t`No`}</DataGridCell>
      </DataGridRow>
    ))
  }

  return (
    <Stack direction="vertical" gap="4">
      <ContentHeader title={t`Networks`} projectId={projectId} actions={headerActions} />

      <div>
        <DataGridToolbar>
          <SearchInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={() => setSearchTerm(searchInput.trim())}
            onClear={() => {
              setSearchInput("")
              setSearchTerm("")
            }}
            placeholder={t`Search networks`}
          />
        </DataGridToolbar>

        <DataGrid columns={COLUMN_COUNT}>
          <DataGridRow>
            <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Admin State`}</DataGridHeadCell>
            <DataGridHeadCell>{t`Shared`}</DataGridHeadCell>
            <DataGridHeadCell>{t`External`}</DataGridHeadCell>
          </DataGridRow>
          {renderBody()}
        </DataGrid>
      </div>
    </Stack>
  )
}

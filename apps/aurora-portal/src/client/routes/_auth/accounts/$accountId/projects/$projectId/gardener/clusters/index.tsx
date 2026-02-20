import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router"
import { Plus, RefreshCw } from "lucide-react"
import React, { useState } from "react"
import { Button } from "@cloudoperators/juno-ui-components/index"
import { Cluster } from "@/server/Gardener/types/cluster"

import { FilterSettings } from "@/client/components/ListToolbar/types"
import { ListToolbar } from "@/client/components/ListToolbar"

import { ClusterTable } from "../-components/ClusterTable"
import CreateClusterWizard from "../-components/CreateClusterDialog"
import { Trans, useLingui } from "@lingui/react/macro"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/gardener/clusters/")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const clusters = await context.trpcClient?.gardener.getClustersByProjectId.query({
      projectId: params.projectId,
    })
    const permissions = await context.trpcClient?.gardener.getPermissions.query({ projectId: params.projectId })

    return {
      clusters,
      permissions,
      trpcClient: context.trpcClient,
    }
  },
})

function RouteComponent() {
  const { t } = useLingui()
  const { clusters, trpcClient, permissions } = useLoaderData({ from: Route.id })
  const router = useRouter()
  // Get unique providers, regions and statuses from clusters
  const versions = [...new Set(clusters?.map((cluster: Cluster) => cluster.version) || [])]
  const statuses = [...new Set(clusters?.map((cluster: Cluster) => cluster.status) || [])]

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Status`,
        filterName: "status",
        values: statuses,
        supportsMultiValue: true,
      },
      {
        displayName: t`Kubernetes Version`,
        filterName: "version",
        values: versions,
        supportsMultiValue: true,
      },
    ],
  })

  const [searchTerm, setSearchTerm] = useState("")

  const [createWizardModal, setCreateWizardModal] = useState(false)

  const handleRefresh = () => {
    router.invalidate()
  }

  const getClustersBySelectedFilters = (clusters: Cluster[] = []) => {
    return clusters?.filter((cluster) => {
      if (filterSettings?.selectedFilters?.length) {
        return filterSettings.selectedFilters?.some((filter) => {
          const { name } = filter

          return filter.value === cluster[name as "status" | "version"]
        })
      }

      return true
    })
  }

  const getClustersBySearchTerm = (clusters: Cluster[] = []) => {
    return (
      clusters.filter((cluster: Cluster) => {
        if (searchTerm.length) {
          return (
            cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cluster.infrastructure.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cluster?.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }

        return true
      }) || []
    )
  }

  // Filter clusters based on search and filter criteria
  // Update your filtered and sorted clusters
  const filteredAndSortedClusters = React.useMemo(() => {
    const clustersBySelectedFilters: Cluster[] = getClustersBySelectedFilters(clusters)
    const clustersBySearchTerm: Cluster[] = getClustersBySearchTerm(clustersBySelectedFilters)

    return clustersBySearchTerm
  }, [clusters, filterSettings])

  const handleCreateWizzard = () => {
    setCreateWizardModal(true)
  }

  return (
    <div className="bg-theme-background-lvl-0 min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Header with title */}
        <div className="flex flex-col items-start justify-between px-4 py-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-theme-high mb-1 text-2xl font-bold">Kubernetes Clusters</h1>
            <p className="text-theme-light">Manage your VM-based Kubernetes deployments</p>
          </div>

          <div className="mt-4 flex gap-2 sm:mt-0">
            <Button onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <Trans>Refresh</Trans>
            </Button>
            {permissions?.create && (
              <Button onClick={handleCreateWizzard} variant="primary">
                <Plus className="mr-2 h-4 w-4" />
                <Trans>New Cluster</Trans>
              </Button>
            )}
          </div>
        </div>

        {/* Main content container */}
        <div>
          <ListToolbar
            filterSettings={filterSettings}
            searchTerm={searchTerm}
            onFilter={setFilterSettings}
            onSearch={setSearchTerm}
            searchInputProps={{ placeholder: t`Search clusters...` }}
          />

          <ClusterTable clusters={filteredAndSortedClusters} filteredCount={clusters?.length || 0} />
        </div>
      </div>
      {createWizardModal && trpcClient && (
        <CreateClusterWizard
          client={trpcClient}
          isOpen={createWizardModal}
          onClose={() => {
            setCreateWizardModal(false)
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}

export default RouteComponent

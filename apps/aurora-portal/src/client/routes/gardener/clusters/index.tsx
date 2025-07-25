import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router"
import { Plus, RefreshCw } from "lucide-react"
import React, { useState } from "react"
import { Button } from "@cloudoperators/juno-ui-components/index"
import { Cluster } from "@/server/Gardener/types/cluster"

import { ClusterTable } from "../-components/ClusterTable"
import CreateClusterWizard from "../-components/CreateClusterDialog"

import { Filters } from "../-components/Filters"
import { FilterSettings } from "../-components/Filters/types"

export const Route = createFileRoute("/gardener/clusters/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const clusters = await context.trpcClient?.gardener.getClusters.query()

    return {
      clusters: clusters,
      trpcClient: context.trpcClient,
    }
  },
})

function RouteComponent() {
  const { clusters, trpcClient } = useLoaderData({ from: Route.id })
  const router = useRouter()
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({})

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
    const { searchTerm = "" } = filterSettings

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

  // Get unique providers, regions and statuses from clusters
  const versions = [...new Set(clusters?.map((cluster: Cluster) => cluster.version) || [])]
  const statuses = [...new Set(clusters?.map((cluster: Cluster) => cluster.status) || [])]

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
    <div className="min-h-screen bg-theme-background-lvl-0">
      <div className="max-w-7xl mx-auto">
        {/* Header with title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold text-theme-high mb-1">Kubernetes Clusters</h1>
            <p className="text-theme-light">Manage your VM-based Kubernetes deployments</p>
          </div>

          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 mr-2`} />
              Refresh
            </Button>
            <Button onClick={handleCreateWizzard} variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              New Cluster
            </Button>
          </div>
        </div>

        {/* Main content container */}
        <div>
          <Filters
            filters={[
              {
                displayName: "Status",
                filterName: "status",
                values: statuses,
              },
              {
                displayName: "Kubernetes Version",
                filterName: "version",
                values: versions,
              },
            ]}
            filterSettings={filterSettings}
            onFilterChange={setFilterSettings}
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

import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import React, { useState } from "react"
import { Button } from "@cloudoperators/juno-ui-components/index"
import { Cluster } from "@/server/Gardener/types/cluster"

import { ClusterTable } from "../-components/ClusterTable"
import CreateClusterWizard from "../-components/CreateClusterDialog"
import { DeleteClusterDialog } from "../-components/DeleteClusterDialog"

import { Filters } from "../-components/Filters"
import { FilterSettings } from "../-components/Filters/types"

// type SortByType = "name-asc" | "name-desc" | "status" | "newest" | ""

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

// const sortClusters = (clusters: Cluster[], sortBy: SortByType) => {
//   switch (sortBy) {
//     case "name-asc":
//       return [...clusters].sort((a, b) => a.name.localeCompare(b.name))
//     case "name-desc":
//       return [...clusters].sort((a, b) => b.name.localeCompare(a.name))
//     case "status":
//       return [...clusters].sort((a, b) => a.status.localeCompare(b.status))
//     case "newest":
//     default:
//       // Assuming clusters have a createdAt or similar date field
//       // If not, you can keep original order or add your own logic
//       // eslint-disable-next-line @typescript-eslint/no-unused-vars
//       return [...clusters].sort((a, b) => {
//         // If you have dates:
//         // return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//         // Otherwise, return original order:
//         return 0
//       })
//   }
// }

function RouteComponent() {
  const { clusters, trpcClient } = useLoaderData({ from: Route.id })
  const router = useRouter()
  // const [sortBy, setSortBy] = useState<SortByType>("")
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({})

  const [createWizardModal, setCreateWizardModal] = useState(false)

  const [deleteClusterModal, setDeleteClusterModal] = useState(false)
  const [deletedClusterName, setDeleteClusterName] = useState<string | null>(null)

  const handleRefresh = () => {
    router.invalidate()
  }

  // Get unique providers, regions and statuses from clusters
  const versions = [...new Set(clusters?.map((cluster) => cluster.version) || [])]
  const statuses = [...new Set(clusters?.map((cluster) => cluster.status) || [])]

  // Filter clusters based on search and filter criteria
  // Update your filtered and sorted clusters
  const filteredAndSortedClusters = React.useMemo(() => {
    const { searchTerm = "" } = filterSettings

    const filtered: Cluster[] =
      clusters
        ?.filter((cluster) => {
          if (filterSettings?.selectedFilters?.length) {
            return filterSettings.selectedFilters?.some((filter) => {
              if (filter.name === "status") {
                return filter.value === cluster.status
              }

              if (filter.name === "version") {
                return filter.value === cluster.version
              }
            })
          }

          return true
        })
        .filter((cluster: Cluster) => {
          if (searchTerm.length) {
            return (
              cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              cluster.infrastructure.toLowerCase().includes(searchTerm.toLowerCase()) ||
              cluster?.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          }

          return true
        }) || []

    return filtered
    // return sortClusters(filtered, sortBy)
  }, [clusters, filterSettings /* sortBy */])

  const handleCreateWizzard = () => {
    setCreateWizardModal(true)
  }

  const handleDeleteCluster = async () => {
    try {
      await trpcClient?.gardener.deleteCluster.mutate({
        name: deletedClusterName!,
      })
      toast.success("Cluster deleted successfully")
      setDeleteClusterModal(false)
      handleRefresh()
    } catch (error) {
      toast.error("Failed to delete cluster: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setDeleteClusterModal(false)
      handleRefresh()
    }
  }

  return (
    <div className="min-h-screen bg-theme-background-lvl-0">
      <div className="max-w-7xl mx-auto">
        {/* Header with title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Kubernetes Clusters</h1>
            <p className="text-gray-400">Manage your VM-based Kubernetes deployments</p>
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
      {deleteClusterModal && (
        <DeleteClusterDialog
          clusterName={deletedClusterName!}
          isOpen={deleteClusterModal}
          onDelete={handleDeleteCluster}
          onClose={() => {
            setDeleteClusterModal(false)
            setDeleteClusterName(null)
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}

export default RouteComponent

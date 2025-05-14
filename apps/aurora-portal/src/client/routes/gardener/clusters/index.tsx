import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import React, { useState } from "react"
import { Cluster } from "@/server/Gardener/types/cluster"

import { ClusterTable } from "../-components/ClusterTable"
import CreateClusterWizard from "../-components/CreateClusterDialog"
import { DeleteClusterDialog } from "../-components/DeleteClusterDialog"
import { SearchBar, SortByType } from "../-components/SearchBar"
import { GardenerButton } from "../-components/ui/GardenerButton"
import { ClusterFilters } from "../-components/ClusterFilters"

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

const sortClusters = (clusters: Cluster[], sortBy: SortByType) => {
  switch (sortBy) {
    case "name-asc":
      return [...clusters].sort((a, b) => a.name.localeCompare(b.name))
    case "name-desc":
      return [...clusters].sort((a, b) => b.name.localeCompare(a.name))
    case "status":
      return [...clusters].sort((a, b) => a.status.localeCompare(b.status))
    case "newest":
    default:
      // Assuming clusters have a createdAt or similar date field
      // If not, you can keep original order or add your own logic
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return [...clusters].sort((a, b) => {
        // If you have dates:
        // return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        // Otherwise, return original order:
        return 0
      })
  }
}

function RouteComponent() {
  const { clusters, trpcClient } = useLoaderData({ from: Route.id })
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortByType>("")

  const [createWizardModal, setCreateWizardModal] = useState(false)

  const [deleteClusterModal, setDeleteClusterModal] = useState(false)
  const [deletedClusterName, setDeleteClusterName] = useState<string | null>(null)

  const [showFilters, setShowFilters] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")

  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  // Function to clear all filters
  const clearFilters = () => {
    setSelectedVersion("")
    setSelectedStatus("")
  }

  const handleRefresh = () => {
    router.invalidate()
  }

  // Get unique providers, regions and statuses from clusters
  const versions = [...new Set(clusters?.map((cluster) => cluster.version) || [])]
  const statuses = [...new Set(clusters?.map((cluster) => cluster.status) || [])]

  // Filter clusters based on search and filter criteria
  // Update your filtered and sorted clusters
  const filteredAndSortedClusters = React.useMemo(() => {
    const filtered =
      clusters?.filter(
        (cluster) =>
          (searchTerm === "" ||
            cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cluster.infrastructure.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cluster.region.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (selectedVersion === "" || cluster.version === selectedVersion) &&
          (selectedStatus === "" || cluster.status === selectedStatus)
      ) || []

    return sortClusters(filtered, sortBy)
  }, [clusters, searchTerm, selectedVersion, selectedVersion, selectedStatus, sortBy])

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
    <div className="min-h-screen bg-gradient-to-b from-aurora-gray-950 to-aurora-gray-900 text-aurora-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-aurora-white mb-1">Kubernetes Clusters</h1>
            <p className="text-aurora-gray-400">Manage your VM-based Kubernetes deployments</p>
          </div>

          <div className="flex gap-2 mt-4 sm:mt-0">
            <GardenerButton size="md" variant="secondary" className="flex items-center" onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 mr-2`} />
              Refresh
            </GardenerButton>
            <GardenerButton
              onClick={handleCreateWizzard}
              size="md"
              variant="primary"
              className="flex items-center bg-aurora-blue-700 hover:bg-aurora-blue-600 border-aurora-blue-600 text-aurora-white shadow-lg shadow-aurora-blue-900/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Cluster
            </GardenerButton>
          </div>
        </div>

        {/* Main content container */}
        <div className="bg-aurora-gray-900 rounded-lg border border-aurora-gray-800 shadow-xl p-6">
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            toggleFilters={toggleFilters}
            setSortTearm={setSortBy}
            sortTearm={sortBy}
            showFilters={showFilters}
          ></SearchBar>

          {/* Filters panel */}
          {showFilters && (
            <ClusterFilters
              selectedStatus={selectedStatus}
              selectedVersion={selectedVersion}
              onStatusChange={setSelectedStatus}
              onVersionChange={setSelectedVersion}
              onClearFilters={clearFilters}
              statuses={statuses}
              versions={versions}
            ></ClusterFilters>
          )}

          <ClusterTable
            clusters={filteredAndSortedClusters}
            filteredCount={clusters?.length || 0}
            setDeleteClusterModal={(clusterName: string) => {
              console.log("Delete cluster:", clusterName)
              setDeleteClusterModal(true)
              setDeleteClusterName(clusterName)
              // You may want to store the clusterName in state if needed for deletion
            }}
          />
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

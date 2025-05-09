import { createFileRoute, useLoaderData } from "@tanstack/react-router"
import ClusterTable from "../-components/ClusterTable"
import { Button } from "@/client/components/headless-ui/Button"
import { Filter, Plus, X } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/gardener/clusters/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const clusters = await context.trpcClient?.gardener.getClusters.query()

    return {
      clusters: clusters,
    }
  },
})

function RouteComponent() {
  const { clusters } = useLoaderData({ from: Route.id })
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")

  // Function to toggle filters panel
  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  // Function to clear all filters
  const clearFilters = () => {
    setSelectedProvider("")
    setSelectedRegion("")
    setSelectedStatus("")
  }

  // Get unique providers, regions and statuses from clusters
  const providers = [...new Set(clusters?.map((cluster) => cluster.infrastructure) || [])]
  const regions = [...new Set(clusters?.map((cluster) => cluster.region) || [])]
  const statuses = [...new Set(clusters?.map((cluster) => cluster.status) || [])]

  return (
    <div className="min-h-screen bg-aurora-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-aurora-white mb-1">Kubernetes Clusters</h1>
            <p className="text-aurora-gray-400">Manage your VM-based Kubernetes deployments</p>
          </div>

          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button size="md" variant="primary" className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Cluster
            </Button>
          </div>
        </div>

        {/* Main content container */}
        <div className="bg-aurora-gray-900 rounded-lg border border-aurora-gray-800 shadow-md p-6">
          {/* Search and filters bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-aurora-gray-800 pb-4 mb-6">
            <div className="flex flex-grow gap-2 items-center mb-4 sm:mb-0">
              <div className="relative max-w-xs w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search clusters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-aurora-gray-800 border border-aurora-gray-700 rounded-md text-aurora-gray-300 focus:outline-none focus:ring-1 focus:ring-aurora-green-500"
                />
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-aurora-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Applied filters badges */}
              {(selectedProvider || selectedRegion || selectedStatus) && (
                <div className="flex flex-wrap gap-2 ml-2">
                  {selectedProvider && (
                    <div className="flex items-center bg-aurora-blue-900/30 text-aurora-blue-300 text-xs rounded px-2 py-1">
                      {selectedProvider}
                      <button onClick={() => setSelectedProvider("")} className="ml-1.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {selectedRegion && (
                    <div className="flex items-center bg-aurora-purple-900/30 text-aurora-purple-300 text-xs rounded px-2 py-1">
                      {selectedRegion}
                      <button onClick={() => setSelectedRegion("")} className="ml-1.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {selectedStatus && (
                    <div className="flex items-center bg-aurora-green-900/30 text-aurora-green-300 text-xs rounded px-2 py-1">
                      {selectedStatus}
                      <button onClick={() => setSelectedStatus("")} className="ml-1.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 self-end">
              <Button
                size="sm"
                variant={showFilters ? "primary" : "secondary"}
                className="flex items-center"
                onClick={toggleFilters}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <select className="bg-aurora-gray-800 border border-aurora-gray-700 rounded-md px-3 py-1 text-aurora-gray-300 text-sm">
                <option value="">Sort: Newest</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-md p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-aurora-white font-medium">Filter Clusters</h3>
                <Button size="sm" variant="secondary" className="text-xs" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-aurora-gray-400 text-sm mb-1.5">Provider</label>
                  <select
                    className="w-full bg-aurora-gray-900 border border-aurora-gray-700 rounded-md px-3 py-1.5 text-aurora-gray-300"
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  >
                    <option value="">All Providers</option>
                    {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-aurora-gray-400 text-sm mb-1.5">Region</label>
                  <select
                    className="w-full bg-aurora-gray-900 border border-aurora-gray-700 rounded-md px-3 py-1.5 text-aurora-gray-300"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                  >
                    <option value="">All Regions</option>
                    {regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-aurora-gray-400 text-sm mb-1.5">Status</label>
                  <select
                    className="w-full bg-aurora-gray-900 border border-aurora-gray-700 rounded-md px-3 py-1.5 text-aurora-gray-300"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Filter and display clusters based on search and filters */}
          <ClusterTable
            propClusters={
              clusters?.filter(
                (cluster) =>
                  (searchTerm === "" ||
                    cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cluster.infrastructure.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cluster.region.toLowerCase().includes(searchTerm.toLowerCase())) &&
                  (selectedProvider === "" || cluster.infrastructure === selectedProvider) &&
                  (selectedRegion === "" || cluster.region === selectedRegion) &&
                  (selectedStatus === "" || cluster.status === selectedStatus)
              ) || []
            }
          />
        </div>
      </div>
    </div>
  )
}

export default RouteComponent

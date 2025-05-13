import React from "react"
import ClusterTableRow from "./ClusterTableRow"
import { Button } from "@/client/components/headless-ui/Button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Cluster } from "@/server/Gardener/types/cluster"
// Inner table component for consistent styling
export const ClusterTable: React.FC<{
  clusters: Cluster[]
  filteredCount: number
  setDeleteClusterModal: (clusterName: string) => void
}> = ({ clusters, filteredCount, setDeleteClusterModal }) => {
  return (
    <div className="w-full">
      {/* Table with enhanced styling */}
      <div className="overflow-hidden rounded-lg border border-aurora-gray-800 bg-aurora-gray-900/70 shadow-md">
        {clusters.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="rounded-full bg-aurora-gray-800 p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-aurora-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-aurora-gray-300 text-lg font-medium mb-1">No clusters found</h3>
            <p className="text-aurora-gray-500 mb-6">No Kubernetes clusters match your current filter criteria</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-aurora-gray-300">
            <thead className="bg-aurora-gray-800/90">
              <tr className="text-aurora-gray-400 border-b border-aurora-gray-700">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Infrastructure</th>
                <th className="p-4 font-medium">Region</th>
                <th className="p-4 font-medium">Version</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((cluster, index) => (
                <ClusterTableRow
                  key={cluster.uid}
                  cluster={cluster}
                  isLast={index === clusters.length - 1}
                  setShowClusterModal={setDeleteClusterModal}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with pagination or summary */}
      {clusters.length > 0 && (
        <div className="mt-4 flex justify-between items-center text-aurora-gray-400 text-sm">
          <div>
            Showing <span className="text-aurora-white">{clusters.length}</span> of{" "}
            <span className="text-aurora-white">{filteredCount}</span> clusters
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="px-3 py-1 bg-aurora-blue-800/40 text-aurora-blue-300 rounded">1</span>
            <Button size="sm" variant="secondary">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

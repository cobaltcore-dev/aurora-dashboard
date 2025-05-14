// components/ClusterFilters/ClusterFilters.tsx
import React from "react"
import { GardenerButton } from "./ui/GardenerButton"
import { GardenerSelect } from "./ui/GardenerSelect"

interface ClusterFiltersProps {
  selectedStatus: string
  selectedVersion: string
  onStatusChange: (status: string) => void
  onVersionChange: (version: string) => void
  onClearFilters: () => void
  statuses: string[]
  versions: string[]
}

export const ClusterFilters: React.FC<ClusterFiltersProps> = ({
  selectedStatus,
  selectedVersion,
  onStatusChange,
  onVersionChange,
  onClearFilters,
  statuses,
  versions,
}) => {
  return (
    <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-md p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-aurora-white font-medium">Filter Clusters</h3>
        <GardenerButton size="sm" variant="secondary" className="text-xs" onClick={onClearFilters}>
          Clear All
        </GardenerButton>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-aurora-gray-400 text-sm mb-1.5">Status</label>
          <GardenerSelect
            className="w-full bg-aurora-gray-900 border border-aurora-gray-700 rounded-md px-3 py-1.5 text-aurora-gray-300"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </GardenerSelect>
        </div>
        <div>
          <label className="block text-aurora-gray-400 text-sm mb-1.5">Kubernetes Version</label>
          <GardenerSelect
            className="w-full bg-aurora-gray-900 border border-aurora-gray-700 rounded-md px-3 py-1.5 text-aurora-gray-300"
            value={selectedVersion}
            onChange={(e) => onVersionChange(e.target.value)}
          >
            <option value="">All Versions</option>
            {versions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </GardenerSelect>
        </div>
      </div>
    </div>
  )
}

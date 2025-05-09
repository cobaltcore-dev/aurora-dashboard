import { X } from "lucide-react"

// Filter badges component
interface FilterBadgesProps {
  selectedProvider: string | null
  selectedRegion: string | null
  selectedStatus: string | null
  setSelectedProvider: (value: string | null) => void
  setSelectedRegion: (value: string | null) => void
  setSelectedStatus: (value: string | null) => void
}

export const FilterBadges: React.FC<FilterBadgesProps> = ({
  selectedProvider,
  selectedRegion,
  selectedStatus,
  setSelectedProvider,
  setSelectedRegion,
  setSelectedStatus,
}) => {
  if (!selectedProvider && !selectedRegion && !selectedStatus) return null

  return (
    <div className="flex flex-wrap gap-2 ml-0 lg:ml-2 mb-4 lg:mb-0">
      {selectedProvider && (
        <div className="flex items-center bg-aurora-blue-900/30 text-aurora-blue-300 text-xs rounded px-2 py-1">
          {selectedProvider}
          <button onClick={() => setSelectedProvider("")} className="ml-1.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {selectedRegion && (
        <div className="flex items-center bg-aurora-blue-900/30 text-aurora-blue-300 text-xs rounded px-2 py-1">
          {selectedRegion}
          <button onClick={() => setSelectedRegion("")} className="ml-1.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {selectedStatus && (
        <div className="flex items-center bg-aurora-blue-900/30 text-aurora-blue-300 text-xs rounded px-2 py-1">
          {selectedStatus}
          <button onClick={() => setSelectedStatus("")} className="ml-1.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

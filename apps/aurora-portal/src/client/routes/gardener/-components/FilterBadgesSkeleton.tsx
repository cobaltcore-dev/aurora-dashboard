import { Skeleton, SkeletonBadge } from "@/client/components/Skeleton"

// Skeleton versions of components for Suspense fallbacks
interface FilterBadgesSkeletonProps {
  selectedProvider?: string
  selectedRegion?: string
  selectedStatus?: string
}

export const FilterBadgesSkeleton = ({
  selectedProvider,
  selectedRegion,
  selectedStatus,
}: FilterBadgesSkeletonProps) => {
  if (!selectedProvider && !selectedRegion && !selectedStatus) return null

  return (
    <div className="flex flex-wrap gap-2 ml-0 lg:ml-2 mb-4 lg:mb-0">
      {selectedProvider && <SkeletonBadge width="20" />}
      {selectedRegion && <SkeletonBadge width="18" />}
      {selectedStatus && <SkeletonBadge width="16" />}
    </div>
  )
}

export const FilterPanelSkeleton = () => (
  <div className="bg-aurora-gray-800/50 border border-aurora-gray-700 rounded-md p-4 mb-6">
    <div className="flex justify-between items-center mb-4">
      <Skeleton width="32" height="5" />
      <Skeleton width="20" height="8" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton width="24" height="4" className="mb-2" />
          <Skeleton width="full" height="9" />
        </div>
      ))}
    </div>
  </div>
)

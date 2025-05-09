import { Skeleton, SkeletonCircle } from "@/client/components/Skeleton"

/**
 * Skeleton loading state specifically for the Clusters table
 */
const ClusterTableSkeleton = () => {
  // Generate array of 5 skeleton rows
  const skeletonRows = Array(5).fill(null)

  return (
    <div className="overflow-hidden">
      {/* Skeleton for table header */}
      <div className="border-b border-aurora-gray-800 pb-4 mb-4 flex justify-between">
        <Skeleton width="40" height="6" />
        <Skeleton width="24" height="6" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-aurora-gray-800">
          <thead className="bg-aurora-gray-900">
            <tr>
              {/* Skeleton headers - 6 columns matching the actual table */}
              {Array(6)
                .fill(null)
                .map((_, index) => (
                  <th key={`header-${index}`} className="px-4 py-3 text-left">
                    <Skeleton width="24" height="5" />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-aurora-gray-800">
            {skeletonRows.map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="bg-aurora-gray-900/30">
                {/* Name column */}
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <Skeleton width="36" height="5" />
                    <Skeleton width="24" height="4" />
                  </div>
                </td>

                {/* Infrastructure column */}
                <td className="p-4">
                  <div className="flex items-center">
                    <Skeleton width="8" height="7" className="mr-2" />
                    <Skeleton width="24" height="5" />
                  </div>
                </td>

                {/* Region column */}
                <td className="p-4">
                  <Skeleton width="24" height="7" />
                </td>

                {/* Version column */}
                <td className="p-4">
                  <Skeleton width="16" height="5" />
                </td>

                {/* Status column */}
                <td className="p-4">
                  <div className="flex items-center">
                    <SkeletonCircle size="6" className="mr-2" />
                    <Skeleton width="20" height="5" />
                  </div>
                </td>

                {/* Actions column */}
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <SkeletonCircle size="8" />
                    <SkeletonCircle size="8" />
                    <SkeletonCircle size="8" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ClusterTableSkeleton

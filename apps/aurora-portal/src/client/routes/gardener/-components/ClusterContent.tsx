import { Cluster } from "@/server/Gardener/types/cluster"
import { ClusterTable } from "./ClusterTable"

/**
 * ClustersContent - Handles data fetching and filtering for clusters
 * This component is wrapped in Suspense in the parent component
 */
interface ClustersContentProps {
  searchTerm: string
  selectedProvider: string
  selectedRegion: string
  selectedStatus: string
  clusters: Array<Cluster>
}

export const ClustersContent = ({
  searchTerm,
  selectedProvider,
  selectedRegion,
  selectedStatus,
  clusters,
}: ClustersContentProps) => {
  // Filter clusters based on search and filter criteria
  const filteredClusters =
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

  return <ClusterTable clusters={filteredClusters} filteredCount={clusters?.length || 0} />
}

export default ClustersContent

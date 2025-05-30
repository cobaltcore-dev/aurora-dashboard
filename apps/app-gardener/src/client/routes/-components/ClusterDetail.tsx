import React from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Share2, Edit, Check } from "lucide-react"

import { Cluster } from "@/bff/types/cluster"
import { toast } from "sonner"
import { GardenerButton } from "./ui/GardenerButton"
import { WorkersSection } from "./ClusterDetail/WorkerSection"
import { SettingsSection } from "./ClusterDetail/SettingsSection"
import { ClusterOverviewCard } from "./ClusterDetail/ClusterOverviewCard"

// Helper function to get status styles

interface ClusterDetailProps {
  cluster: Cluster
}

const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster }) => {
  // Function to handle sharing cluster info
  const handleShare = async () => {
    try {
      // Create a shareable URL or text about the cluster
      const clusterInfo = `Cluster: ${cluster.name}\nID: ${cluster.uid}\nProvider: ${cluster.infrastructure}\nRegion: ${cluster.region}\nStatus: ${cluster.status}\nVersion: ${cluster.version}`

      // Copy to clipboard
      await navigator.clipboard.writeText(clusterInfo)

      // Show success toast notification
      toast.success("Cluster details copied to clipboard!", {
        duration: 3000,
        icon: <Check className="h-4 w-4 text-aurora-green-500" />,
        description: "You can now share this information with your team",
        position: "top-right",
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Show error toast if clipboard write fails
      toast.error("Failed to copy to clipboard", {
        duration: 3000,
        description: "Please try again or copy manually",
        position: "top-right",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-aurora-gray-950 to-aurora-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with back GardenerButton and title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="flex items-center mb-4 sm:mb-0">
            <Link to="/clusters">
              <GardenerButton size="md" variant="secondary" className="mr-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return
              </GardenerButton>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-aurora-white">Cluster Details</h1>
              <p className="text-aurora-gray-400 text-sm mt-1">View and manage your Kubernetes cluster</p>
            </div>
          </div>

          <div className="flex gap-2">
            <GardenerButton
              size="md"
              variant="secondary"
              onClick={handleShare}
              className="hover:bg-aurora-blue-900/20 hover:text-aurora-blue-300 hover:border-aurora-blue-700"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </GardenerButton>
            <GardenerButton size="md" disabled variant="disabled">
              <Edit className="mr-2 h-4 w-4" />
              Edit Cluster
            </GardenerButton>
          </div>
        </div>
        {/* Cluster Overview Card */}
        <ClusterOverviewCard cluster={cluster} handleShare={handleShare} />
        {/* Workers Section */}
        <WorkersSection workers={cluster.workers} />

        {/* Settings Section */}
        <SettingsSection maintenance={cluster.maintenance} autoUpdate={cluster.autoUpdate} />
      </div>
    </div>
  )
}

export default ClusterDetail

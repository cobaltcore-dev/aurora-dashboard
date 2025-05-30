import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react"
import { Cluster } from "@/bff/types/cluster"
import { GardenerCard, GardenerCardHeader, GardenerCardContent, GardenerCardTitle } from "../ui/GardenerCard"

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "healthy":
    case "operational":
      return {
        bg: "bg-aurora-green-500",
        glow: "shadow-lg shadow-aurora-green-500/30",
        text: "text-aurora-green-500",
        badgeBg: "bg-aurora-green-900/20",
        badgeBorder: "border-aurora-green-700/30",
        badgeText: "text-aurora-green-400",
        pulse: false,
        icon: <CheckCircle className="h-4 w-4 text-white" />,
      }
    case "warning":
    case "pending":
      return {
        bg: "bg-aurora-yellow-500",
        glow: "shadow-lg shadow-aurora-yellow-500/30",
        text: "text-aurora-yellow-500",
        badgeBg: "bg-aurora-yellow-900/20",
        badgeBorder: "border-aurora-yellow-700/30",
        badgeText: "text-aurora-yellow-400",
        pulse: true,
        icon: <Clock className="h-4 w-4 text-white" />,
      }
    case "unhealthy":
    case "error":
    case "failed":
      return {
        bg: "bg-aurora-red-500",
        glow: "shadow-lg shadow-aurora-red-500/30",
        text: "text-aurora-red-500",
        badgeBg: "bg-aurora-red-900/20",
        badgeBorder: "border-aurora-red-700/30",
        badgeText: "text-aurora-red-400",
        pulse: false,
        icon: <XCircle className="h-4 w-4 text-white" />,
      }
    default:
      return {
        bg: "bg-aurora-gray-500",
        glow: "shadow-md shadow-aurora-gray-500/20",
        text: "text-aurora-gray-500",
        badgeBg: "bg-aurora-gray-900/20",
        badgeBorder: "border-aurora-gray-700/30",
        badgeText: "text-aurora-gray-400",
        pulse: false,
        icon: <AlertTriangle className="h-4 w-4 text-white" />,
      }
  }
}

// Component to render maintenance & auto update settings
export const ClusterOverviewCard: React.FC<{
  cluster: Cluster
  handleShare: () => void
}> = ({ cluster, handleShare }) => {
  const statusStyles = getStatusStyles(cluster.status)

  return (
    <GardenerCard className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-xl">
      <GardenerCardHeader className="flex flex-row items-center justify-between border-b border-aurora-gray-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
          <div>
            <GardenerCardTitle className="text-2xl">{cluster.name}</GardenerCardTitle>
            <div
              className="text-sm text-aurora-gray-400 mt-1.5 hover:text-aurora-gray-300 transition-colors cursor-pointer"
              onClick={handleShare}
            >
              ID: <span className="font-mono">{cluster.uid}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <div className="flex items-center">
              <div
                className={`relative w-6 h-6 rounded-full ${statusStyles.bg} ${statusStyles.glow} flex items-center justify-center ${statusStyles.pulse ? "animate-pulse" : ""} mr-2`}
              >
                {statusStyles.icon}
              </div>
              <div className={`text-lg font-medium ${statusStyles.text}`}>{cluster.status}</div>
            </div>
            <div
              className={`px-3 py-1.5 rounded text-sm ${statusStyles.badgeBg} ${statusStyles.badgeText} border ${statusStyles.badgeBorder}`}
            >
              Readiness: {cluster.readiness}
            </div>
          </div>
        </div>
      </GardenerCardHeader>

      <GardenerCardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GardenerCard className="border-aurora-gray-700 h-full">
            <GardenerCardHeader className="py-3">
              <GardenerCardTitle className="text-sm font-medium text-aurora-gray-400 uppercase tracking-wider">
                Infrastructure
              </GardenerCardTitle>
            </GardenerCardHeader>
            <GardenerCardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Provider:</span>
                <div className="flex items-center">
                  <div className="rounded-md bg-aurora-gray-800 py-1 px-2 mr-2 border border-aurora-gray-700">
                    <span className="uppercase text-xs font-mono text-aurora-blue-300">
                      {cluster.infrastructure.substring(0, 3)}
                    </span>
                  </div>
                  <span className="text-aurora-gray-200 capitalize">{cluster.infrastructure}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Region:</span>
                <span className="px-2 py-1 rounded-md bg-aurora-gray-800/80 text-sm text-aurora-purple-300">
                  {cluster.region}
                </span>
              </div>
            </GardenerCardContent>
          </GardenerCard>

          <GardenerCard className="border-aurora-gray-700 h-full">
            <GardenerCardHeader className="py-3">
              <GardenerCardTitle className="text-sm font-medium text-aurora-gray-400 uppercase tracking-wider">
                Kubernetes
              </GardenerCardTitle>
            </GardenerCardHeader>
            <GardenerCardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Version:</span>
                <div className="flex items-center text-aurora-gray-200">
                  <span className="text-aurora-blue-400 mr-0.5">v</span>
                  {cluster.version}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Readiness:</span>
                <div
                  className={`px-2 py-1 rounded text-sm ${statusStyles.badgeBg} ${statusStyles.badgeText} border ${statusStyles.badgeBorder}`}
                >
                  {cluster.readiness}
                </div>
              </div>
            </GardenerCardContent>
          </GardenerCard>
        </div>
      </GardenerCardContent>
    </GardenerCard>
  )
}

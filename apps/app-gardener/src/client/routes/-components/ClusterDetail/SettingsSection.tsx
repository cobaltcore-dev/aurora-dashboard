import { CheckCircle, XCircle } from "lucide-react"
import { GardenerCard, GardenerCardHeader, GardenerCardTitle, GardenerCardContent } from "../ui/GardenerCard"
import { Cluster } from "@/bff/types/cluster"

// Component to render maintenance & auto update settings
export const SettingsSection: React.FC<{
  maintenance: Cluster["maintenance"]
  autoUpdate: Cluster["autoUpdate"]
}> = ({ maintenance, autoUpdate }) => {
  return (
    <GardenerCard className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-xl">
      <GardenerCardHeader className="flex flex-row items-center justify-between border-b border-aurora-gray-800 pb-4">
        <GardenerCardTitle className="text-xl font-medium">Settings</GardenerCardTitle>
      </GardenerCardHeader>
      <GardenerCardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GardenerCard className="border-aurora-gray-700 h-full">
            <GardenerCardHeader>
              <div className="flex items-center">
                <GardenerCardTitle className="text-lg">Maintenance Window</GardenerCardTitle>
                <span className="ml-2 px-2 py-0.5 text-xs bg-aurora-orange-900/30 text-aurora-orange-300 rounded border border-aurora-orange-700/30">
                  Scheduled
                </span>
              </div>
            </GardenerCardHeader>
            <GardenerCardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Start Time:</span>
                <span className="text-aurora-gray-200 px-2 py-1 bg-aurora-gray-800 rounded font-mono text-sm">
                  {maintenance.startTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Window Time:</span>
                <span className="text-aurora-gray-200 px-2 py-1 bg-aurora-gray-800 rounded font-mono text-sm">
                  {maintenance.windowTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Timezone:</span>
                <span className="text-aurora-gray-200 px-2 py-1 bg-aurora-gray-800 rounded font-mono text-sm">
                  {maintenance.timezone}
                </span>
              </div>
            </GardenerCardContent>
          </GardenerCard>

          <GardenerCard className="border-aurora-gray-700 h-full">
            <GardenerCardHeader>
              <GardenerCardTitle className="text-lg">Auto Update</GardenerCardTitle>
            </GardenerCardHeader>
            <GardenerCardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">OS Updates:</span>
                {autoUpdate.os ? (
                  <div className="flex items-center px-2 py-1 bg-aurora-green-900/20 text-aurora-green-400 rounded border border-aurora-green-700/30">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center px-2 py-1 bg-aurora-red-900/20 text-aurora-red-400 rounded border border-aurora-red-700/30">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Disabled</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aurora-gray-400">Kubernetes Updates:</span>
                {autoUpdate.kubernetes ? (
                  <div className="flex items-center px-2 py-1 bg-aurora-green-900/20 text-aurora-green-400 rounded border border-aurora-green-700/30">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center px-2 py-1 bg-aurora-red-900/20 text-aurora-red-400 rounded border border-aurora-red-700/30">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-sm">Disabled</span>
                  </div>
                )}
              </div>
            </GardenerCardContent>
          </GardenerCard>
        </div>
      </GardenerCardContent>
    </GardenerCard>
  )
}

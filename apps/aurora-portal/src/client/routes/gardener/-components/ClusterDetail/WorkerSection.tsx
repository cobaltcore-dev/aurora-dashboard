import { Cluster } from "@/server/Gardener/types/cluster"
import { Button } from "@cloudoperators/juno-ui-components"
import { GardenerCard, GardenerCardContent, GardenerCardHeader, GardenerCardTitle } from "../ui/GardenerCard"
import { AlertTriangle, RefreshCcw } from "lucide-react"
import {
  GardenerTable,
  GardenerTableBody,
  GardenerTableCell,
  GardenerTableHead,
  GardenerTableHeader,
  GardenerTableRow,
} from "../ui/GardenerTable"

// Component to render worker details
export const WorkersSection: React.FC<{ workers: Cluster["workers"] }> = ({ workers }) => {
  if (!workers || workers.length === 0) {
    return (
      <GardenerCard className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-xl">
        <GardenerCardHeader className="flex flex-row items-center justify-between border-b border-aurora-gray-800 pb-4">
          <GardenerCardTitle className="text-xl font-medium">Workers</GardenerCardTitle>
          <Button>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Add Worker
          </Button>
        </GardenerCardHeader>
        <GardenerCardContent className="pt-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-aurora-gray-800/50 rounded-full p-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-aurora-gray-500" />
            </div>
            <p className="text-aurora-gray-400 mb-1">No worker nodes configured for this cluster.</p>
            <p className="text-sm text-aurora-gray-500">Add worker nodes to run your workloads</p>
          </div>
        </GardenerCardContent>
      </GardenerCard>
    )
  }

  return (
    <GardenerCard className="mt-6 bg-aurora-gray-900 border-aurora-gray-800 text-aurora-white shadow-xl">
      <GardenerCardHeader className="flex flex-row items-center justify-between border-b border-aurora-gray-800 pb-4">
        <GardenerCardTitle className="text-xl font-medium">Workers</GardenerCardTitle>
      </GardenerCardHeader>
      <GardenerCardContent className="pt-4">
        <GardenerTable>
          <GardenerTableHeader className="bg-aurora-gray-800/80">
            <GardenerTableRow className="border-aurora-gray-700">
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Name
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Machine Type
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Image
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Scaling
              </GardenerTableHead>
              <GardenerTableHead className="text-aurora-gray-300 font-medium uppercase text-xs tracking-wider">
                Zones
              </GardenerTableHead>
            </GardenerTableRow>
          </GardenerTableHeader>
          <GardenerTableBody>
            {workers.map((worker) => (
              <GardenerTableRow
                key={worker.name}
                className="border-aurora-gray-800 hover:bg-aurora-gray-800/30 transition-colors"
              >
                <GardenerTableCell className="font-medium text-aurora-white">
                  <div className="flex flex-col">
                    <span>{worker.name}</span>
                    <span className="text-xs text-aurora-gray-400 mt-1">{worker.architecture}</span>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-col">
                    <span className="text-aurora-gray-200">{worker.machineType}</span>
                    <span className="text-xs text-aurora-blue-300 mt-1">{worker.containerRuntime}</span>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-col">
                    <span className="text-aurora-gray-200">{worker.machineImage.name}</span>
                    <div className="flex items-center mt-1">
                      <span className="text-aurora-blue-400 text-xs">v</span>
                      <span className="text-xs text-aurora-gray-400">{worker.machineImage.version}</span>
                    </div>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-col">
                    <span className="text-aurora-gray-200">
                      {worker.actual !== undefined ? worker.actual : "?"} nodes
                    </span>
                    <span className="text-xs text-aurora-gray-400 mt-1">
                      Min: {worker.min} / Max: {worker.max} / Surge: {worker.maxSurge}
                    </span>
                  </div>
                </GardenerTableCell>
                <GardenerTableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {worker.zones.map((zone) => (
                      <span
                        key={zone}
                        className="px-2 py-0.5 text-xs bg-aurora-gray-800 text-aurora-purple-300 rounded-md border border-aurora-gray-700"
                      >
                        {zone}
                      </span>
                    ))}
                  </div>
                </GardenerTableCell>
              </GardenerTableRow>
            ))}
          </GardenerTableBody>
        </GardenerTable>
      </GardenerCardContent>
    </GardenerCard>
  )
}

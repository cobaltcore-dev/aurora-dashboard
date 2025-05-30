// components/CreateClusterWizard/WorkerPool.tsx
import React from "react"
import { WorkerConfig } from "./types"

import { X } from "lucide-react"
import { GardenerButton } from "../ui/GardenerButton"
import { GardenerLabel } from "../ui/GardenerLabel"
import { GardenerSelect } from "../ui/GardenerSelect"
import { GardenerInput } from "../ui/GardenerInput"

interface WorkerPoolProps {
  workers: WorkerConfig[]
  onWorkerChange: (index: number, field: keyof WorkerConfig | string, value: unknown) => void
  onAddWorker: () => void
  onRemoveWorker: (index: number) => void
  machineTypes?: Array<{ name: string; architecture: string; cpu: string; memory: string }>
  machineImages?: Array<{ name: string; versions: string[] }>
  availableZones?: string[]
}

export const WorkerPool: React.FC<WorkerPoolProps> = ({
  workers,
  onWorkerChange,
  onAddWorker,
  onRemoveWorker,
  machineTypes = [],
  machineImages = [],
  availableZones = [],
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-aurora-white text-left">Worker Pools</h3>
        <GardenerButton
          onClick={onAddWorker}
          variant="secondary"
          className="border-aurora-gray-700 bg-aurora-gray-800 text-aurora-white hover:bg-aurora-gray-700"
        >
          Add Worker Pool
        </GardenerButton>
      </div>

      {workers.map((worker, index) => {
        const handleMachineImageChange = (field: "name" | "version", value: string) => {
          onWorkerChange(index, "machineImage", {
            ...worker.machineImage,
            [field]: value,
          })
        }

        const selectedImage = machineImages.find((img) => img.name === worker.machineImage.name)
        const availableVersions = selectedImage?.versions || []

        return (
          <div key={index} className="p-4 border border-aurora-gray-700 rounded-lg bg-aurora-gray-800/50 space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-aurora-white font-medium text-left">Worker Pool #{index + 1}</h4>
              {workers.length > 1 && (
                <GardenerButton
                  onClick={() => onRemoveWorker(index)}
                  variant="ghost"
                  className="h-8 w-8 p-0 text-aurora-red-400 hover:text-aurora-red-300 hover:bg-aurora-gray-700/50"
                >
                  <X className="h-4 w-4" />
                </GardenerButton>
              )}
            </div>

            {/* Machine Type - Full width */}
            <div>
              <GardenerLabel
                htmlFor={`worker-machine-type-${index}`}
                className="text-aurora-gray-300 mb-2 block text-left"
              >
                Machine Type
              </GardenerLabel>
              <GardenerSelect
                id={`worker-machine-type-${index}`}
                value={worker.machineType}
                className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
                onChange={(e) => onWorkerChange(index, "machineType", e.target.value)}
              >
                {machineTypes.map((machine) => (
                  <option key={machine.name} value={machine.name}>
                    {machine.name} ({machine.cpu} CPU, {machine.memory})
                  </option>
                ))}
              </GardenerSelect>
            </div>

            {/* Machine Image and Version - Two columns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <GardenerLabel htmlFor={`worker-image-${index}`} className="text-aurora-gray-300 mb-2 block text-left">
                  Machine Image
                </GardenerLabel>
                <GardenerSelect
                  id={`worker-image-${index}`}
                  value={worker.machineImage.name}
                  className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
                  onChange={(e) => handleMachineImageChange("name", e.target.value)}
                >
                  {machineImages.map((image) => (
                    <option key={image.name} value={image.name}>
                      {image.name}
                    </option>
                  ))}
                </GardenerSelect>
              </div>

              <div>
                <GardenerLabel
                  htmlFor={`worker-version-${index}`}
                  className="text-aurora-gray-300 mb-2 block text-left"
                >
                  Image Version
                </GardenerLabel>
                <GardenerSelect
                  id={`worker-version-${index}`}
                  value={worker.machineImage.version}
                  className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
                  onChange={(e) => handleMachineImageChange("version", e.target.value)}
                >
                  {availableVersions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </GardenerSelect>
              </div>
            </div>

            {/* Minimum and Maximum Nodes - Two columns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <GardenerLabel htmlFor={`worker-min-${index}`} className="text-aurora-gray-300 mb-2 block text-left">
                  Minimum Nodes
                </GardenerLabel>
                <GardenerInput
                  id={`worker-min-${index}`}
                  type="number"
                  min="1"
                  className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
                  value={worker.minimum}
                  onChange={(e) => onWorkerChange(index, "minimum", parseInt(e.target.value))}
                />
              </div>

              <div>
                <GardenerLabel htmlFor={`worker-max-${index}`} className="text-aurora-gray-300 mb-2 block text-left">
                  Maximum Nodes
                </GardenerLabel>
                <GardenerInput
                  id={`worker-max-${index}`}
                  type="number"
                  min={worker.minimum}
                  className="w-full h-10 px-3 bg-aurora-gray-800 border border-aurora-gray-700 text-aurora-white rounded-md"
                  value={worker.maximum}
                  onChange={(e) => onWorkerChange(index, "maximum", parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Availability Zones */}
            <div>
              <GardenerLabel className="text-aurora-gray-300 mb-2 block text-left">Availability Zones</GardenerLabel>
              <div className="grid grid-cols-2 gap-2">
                {availableZones.map((zone) => (
                  <div key={zone} className="flex items-center space-x-2">
                    <GardenerInput
                      type="checkbox"
                      id={`zone-${index}-${zone}`}
                      checked={worker.zones.includes(zone)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onWorkerChange(index, "zones", [...worker.zones, zone])
                        } else {
                          onWorkerChange(
                            index,
                            "zones",
                            worker.zones.filter((z) => z !== zone)
                          )
                        }
                      }}
                      className="h-4 w-4 rounded border-aurora-gray-700 bg-aurora-gray-700 text-aurora-blue-600 focus:ring-aurora-blue-600 focus:ring-offset-aurora-gray-900"
                    />
                    <label htmlFor={`zone-${index}-${zone}`} className="text-sm text-aurora-gray-300 text-left">
                      {zone}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

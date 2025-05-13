// components/CreateClusterWizard/WorkerPool.tsx
import React from "react"
import { WorkerConfig } from "./types"
import { Label } from "@/client/components/headless-ui/Label"
import { Input } from "@/client/components/headless-ui/Input"
import { Select } from "@/client/components/headless-ui/Select"
import { Button } from "@/client/components/headless-ui/Button"
import { X } from "lucide-react"

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
        <h3 className="text-lg font-medium text-aurora-white">Worker Pools</h3>
        <Button
          onClick={onAddWorker}
          variant="secondary"
          className="border-aurora-gray-700 bg-aurora-gray-800 text-aurora-white hover:bg-aurora-gray-700"
        >
          Add Worker Pool
        </Button>
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
          <div key={index} className="p-4 border border-aurora-gray-700 rounded-lg bg-aurora-gray-800/50 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-aurora-white font-medium">Worker Pool #{index + 1}</h4>
              {workers.length > 1 && (
                <Button
                  onClick={() => onRemoveWorker(index)}
                  variant="ghost"
                  className="h-8 w-8 p-0 text-aurora-red-400 hover:text-aurora-red-300 hover:bg-aurora-gray-700/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`worker-machine-type-${index}`} className="text-aurora-gray-300">
                  Machine Type
                </Label>
                <Select
                  id={`worker-machine-type-${index}`}
                  value={worker.machineType}
                  className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
                  onChange={(e) => onWorkerChange(index, "machineType", e.target.value)}
                >
                  {machineTypes.map((machine) => (
                    <option key={machine.name} value={machine.name}>
                      {machine.name} ({machine.cpu} CPU, {machine.memory})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`worker-image-${index}`} className="text-aurora-gray-300">
                    Machine Image
                  </Label>
                  <Select
                    id={`worker-image-${index}`}
                    value={worker.machineImage.name}
                    className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
                    onChange={(e) => handleMachineImageChange("name", e.target.value)}
                  >
                    {machineImages.map((image) => (
                      <option key={image.name} value={image.name}>
                        {image.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`worker-version-${index}`} className="text-aurora-gray-300">
                    Image Version
                  </Label>
                  <Select
                    id={`worker-version-${index}`}
                    value={worker.machineImage.version}
                    className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
                    onChange={(e) => handleMachineImageChange("version", e.target.value)}
                  >
                    {availableVersions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`worker-min-${index}`} className="text-aurora-gray-300">
                  Minimum Nodes
                </Label>
                <Input
                  id={`worker-min-${index}`}
                  type="number"
                  min="1"
                  className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
                  value={worker.minimum}
                  onChange={(e) => onWorkerChange(index, "minimum", parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor={`worker-max-${index}`} className="text-aurora-gray-300">
                  Maximum Nodes
                </Label>
                <Input
                  id={`worker-max-${index}`}
                  type="number"
                  min={worker.minimum}
                  className="mt-1 bg-aurora-gray-800 border-aurora-gray-700 text-aurora-white"
                  value={worker.maximum}
                  onChange={(e) => onWorkerChange(index, "maximum", parseInt(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label className="text-aurora-gray-300">Availability Zones</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {availableZones.map((zone) => (
                  <div key={zone} className="flex items-center space-x-2">
                    <input
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
                    <label htmlFor={`zone-${index}-${zone}`} className="text-sm text-aurora-gray-300">
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

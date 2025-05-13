import { WorkerConfig } from "./types"

export const defaultWorker: WorkerConfig = {
  name: "worker-pool-1",
  machineType: "g_c2_m4",
  machineImageName: "gardenlinux",
  machineImageVersion: "1592.9.0",
  architecture: "amd64",
  min: 1,
  max: 2,
  maxSurge: 1,
  zones: ["eu-de-1d"],
  containerRuntime: "containerd",
}

export const steps = [
  { title: "Basic Info", description: "Cluster name and Kubernetes version" },
  { title: "Infrastructure", description: "Provider, region and networking" },
  { title: "Worker Nodes", description: "Configure worker node pools" },
  { title: "Review", description: "Review your configuration" },
]

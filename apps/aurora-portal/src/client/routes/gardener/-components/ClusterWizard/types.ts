// types/cluster.ts
export type WorkerConfig = {
  name: string
  machineType: string
  machineImageName: string
  machineImageVersion: string
  architecture: string
  min: number
  max: number
  maxSurge: number
  zones: string[]
  containerRuntime: string
}

export type ClusterFormData = {
  name: string
  kubernetes: {
    version: string
  }
  region: string
  cloudProfileName: string
  secretBindingName: string
  networking: {
    type: string
    pods: string
    nodes: string
    services: string
    ipFamilies: string[]
  }
  provider: {
    type: string
    workers: WorkerConfig[]
  }
}

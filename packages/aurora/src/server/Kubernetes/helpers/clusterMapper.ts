/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Shoot } from "../types/shoot"
import type { Cluster } from "../types/cluster"
import { calculateAvailableUpdates } from "./versionUpdates"

/**
 * Maps a Gardener Shoot to the Aurora Cluster type.
 * Ported from elektra/plugins/kubernetes_ng/app/services/service_layer/kubernetes_ng_services.rb#convert_shoot_to_cluster
 */
export function shootToCluster(
  shoot: Shoot,
  opts: {
    versionsByProfile?: Map<string, string[]>
    includeRaw: boolean
  }
): Cluster {
  const spec = shoot.spec as any
  const status = shoot.status as any
  const metadata = shoot.metadata as any

  // Status from label
  const statusLabel = metadata.labels?.["shoot.gardener.cloud/status"]
  let clusterStatus: Cluster["status"] = "unknown"
  if (statusLabel === "healthy") clusterStatus = "healthy"
  else if (statusLabel === "progressing") clusterStatus = "progressing"
  else if (statusLabel === "unhealthy") clusterStatus = "unhealthy"

  // Readiness conditions
  const conditions = (status?.conditions ?? []).map((c: any) => {
    const displayValue =
      c.type === "APIServerAvailable"
        ? "API"
        : c.type === "ControlPlaneHealthy"
          ? "CP"
          : c.type === "ObservabilityComponentsHealthy"
            ? "OC"
            : c.type === "SystemComponentsHealthy"
              ? "SC"
              : c.type === "EveryNodeReady"
                ? "N"
                : c.type

    return {
      displayValue,
      type: c.type,
      status: c.status,
      message: c.message,
      lastUpdateTime: c.lastUpdateTime,
    }
  })
  const trueCount = conditions.filter((c: any) => c.status === "True").length
  const readiness = {
    status: `${trueCount}/${conditions.length}`,
    conditions,
  }

  // Last operation
  let lastOperationSummary: string | undefined
  if (status?.lastOperation) {
    const { type, state, progress } = status.lastOperation
    lastOperationSummary = [type, state, progress != null ? `(${progress}%)` : null].filter(Boolean).join(" ")
  }

  // Last errors
  const lastErrors = (status?.lastErrors ?? [])
    .filter((e: any) => e.description && e.taskID)
    .map((e: any) => ({
      description: e.description,
      taskID: e.taskID,
      lastUpdateTime: e.lastUpdateTime,
    }))

  // Add-ons
  const addOns: string[] = []
  if (spec?.addons && typeof spec.addons === "object") {
    for (const [key, value] of Object.entries(spec.addons)) {
      if (value && typeof value === "object" && (value as any).enabled === true) {
        addOns.push(key)
      }
    }
  }

  // Maintenance: convert "220000+0100" → "22:00", "+0100" → "+01:00"
  const parseGardenerTime = (t: string | undefined): string | undefined => {
    if (!t) return undefined
    // Extract HHMMSS and timezone
    const match = /^(\d{2})(\d{2})(\d{2})([+-]\d{4})$/.exec(t)
    if (!match) return t
    return `${match[1]}:${match[2]}`
  }
  const parseTimezone = (t: string | undefined): string | undefined => {
    if (!t) return undefined
    const match = /([+-])(\d{2})(\d{2})$/.exec(t)
    if (!match) return t
    return `${match[1]}${match[2]}:${match[3]}`
  }

  const maintenanceBegin = spec?.maintenance?.timeWindow?.begin
  const maintenanceEnd = spec?.maintenance?.timeWindow?.end

  const maintenance = {
    startTime: parseGardenerTime(maintenanceBegin) ?? "",
    endTime: parseGardenerTime(maintenanceEnd) ?? "",
    timezone: parseTimezone(maintenanceBegin) ?? "",
  }

  // Auto-update
  const autoUpdate = {
    os: spec?.maintenance?.autoUpdate?.machineImageVersion === true,
    kubernetes: spec?.maintenance?.autoUpdate?.kubernetesVersion === true,
  }

  // Workers
  const workers = (spec?.provider?.workers ?? []).map((w: any) => ({
    name: w.name,
    architecture: w.architecture,
    machineType: w.machine?.type,
    machineImage: {
      name: w.machine?.image?.name,
      version: w.machine?.image?.version,
    },
    containerRuntime: w.cri?.name,
    min: w.minimum,
    max: w.maximum,
    maxSurge: w.maxSurge,
    zones: w.zones ?? [],
  }))

  // Cloud profile name (older shoots use spec.cloudProfileName)
  const cloudProfileName = spec?.cloudProfile?.name ?? spec?.cloudProfileName

  // Version updates
  let versionUpdates: Cluster["versionUpdates"] = null
  if (opts.versionsByProfile && cloudProfileName && spec?.kubernetes?.version) {
    const available = opts.versionsByProfile.get(cloudProfileName)
    versionUpdates = calculateAvailableUpdates(spec.kubernetes.version, available)
  }

  const cluster: Cluster = {
    uid: metadata.uid,
    name: metadata.name,
    namespace: metadata.namespace,
    createdBy: metadata.annotations?.["gardener.cloud/created-by"],
    isDeleted: !!metadata.deletionTimestamp,
    region: spec?.region,
    infrastructure: spec?.provider?.type,
    status: clusterStatus,
    version: spec?.kubernetes?.version,
    versionUpdates,
    readiness,
    purpose: spec?.purpose,
    addOns,
    cloudProfileName,
    labels: metadata.labels ?? {},
    lastOperation: status?.lastOperation
      ? {
          description: status.lastOperation.description,
          lastUpdateTime: status.lastOperation.lastUpdateTime,
          progress: status.lastOperation.progress,
          state: status.lastOperation.state,
          type: status.lastOperation.type,
        }
      : undefined,
    lastOperationSummary,
    lastErrors,
    workers,
    maintenance,
    lastMaintenance: {
      state: status?.lastMaintenance?.state,
    },
    autoUpdate,
  }

  if (opts.includeRaw) {
    cluster.raw = shoot as any
  }

  return cluster
}

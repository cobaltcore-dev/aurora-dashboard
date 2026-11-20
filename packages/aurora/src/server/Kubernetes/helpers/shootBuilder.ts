/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod"
import type { clusterCreateInputSchema, clusterUpdateInputSchema, workerGroupInputSchema } from "../types/cluster"
import type { Shoot } from "../types/shoot"

type ClusterCreateInput = z.infer<typeof clusterCreateInputSchema>
type ClusterUpdateInput = z.infer<typeof clusterUpdateInputSchema>
type WorkerGroupInput = z.infer<typeof workerGroupInputSchema>

/**
 * Builds a Shoot spec for cluster creation.
 * Ported from elektra/plugins/kubernetes_ng/app/services/service_layer/kubernetes_ng_services.rb#convert_cluster_to_shoot
 * and #build_shoot_spec.
 *
 * Note: Sets apiVersion/kind on the top-level Shoot and kind: InfrastructureConfig on infrastructureConfig.
 * These are additions over Elektra to meet Gardener's schema expectations.
 */
export function buildShootForCreate(input: ClusterCreateInput, region: string): Record<string, unknown> {
  const shoot: Record<string, unknown> = {
    apiVersion: "core.gardener.cloud/v1beta1",
    kind: "Shoot",
    metadata: {
      name: input.name,
    },
    spec: {
      region,
      cloudProfile: {
        name: input.cloudProfileName,
      },
      kubernetes: {
        version: input.kubernetesVersion,
      },
      provider: {
        type: input.cloudProfileName,
        infrastructureConfig: {
          apiVersion: input.infrastructure.apiVersion,
          kind: "InfrastructureConfig",
          floatingPoolName: input.infrastructure.floatingPoolName,
        } as Record<string, unknown>,
        workers: input.workers.map((w) => ({
          name: w.name,
          minimum: w.minimum,
          maximum: w.maximum,
          zones: w.zones,
          machine: {
            type: w.machineType,
            image: {
              name: w.machineImage.name,
              version: w.machineImage.version,
            },
          },
        })),
      },
    },
  }

  // Add optional networking fields
  if (input.networking) {
    const networking: Record<string, string> = {}
    if (input.networking.pods) networking.pods = input.networking.pods
    if (input.networking.nodes) networking.nodes = input.networking.nodes
    if (input.networking.services) networking.services = input.networking.services
    if (Object.keys(networking).length > 0) {
      ;(shoot.spec as any).networking = networking
    }
  }

  // Add optional networkWorkers
  if (input.infrastructure.networkWorkers) {
    const infraConfig = (shoot.spec as any).provider.infrastructureConfig
    infraConfig.networks = {
      workers: input.infrastructure.networkWorkers,
    }
  }

  return shoot
}

/**
 * Converts "22:00" and "+01:00" to "220000+0100".
 * Ported from elektra/plugins/kubernetes_ng/app/helpers/kubernetes/clusters_helper.rb#convert_display_to_gardener_time
 */
export function toGardenerTime(time: string, timezone: string): string {
  const cleanedTime = time.replace(/:/g, "")
  const cleanedTimezone = timezone.replace(/:/g, "")
  return `${cleanedTime}00${cleanedTimezone}`
}

/**
 * Merges edited worker groups with existing workers, keeping unedited fields.
 * Workers are matched by name. Unmatched existing workers are dropped (removal).
 * Unmatched edited workers are added as new entries.
 */
export function mergeWorkers(existing: unknown[], edited: WorkerGroupInput[]): unknown[] {
  const result: unknown[] = []
  const editedByName = new Map(edited.map((w) => [w.name, w]))
  const processedNames = new Set<string>()

  // Update existing workers that have edits
  for (const existingWorker of existing) {
    if (typeof existingWorker !== "object" || !existingWorker) continue
    const name = (existingWorker as any).name
    if (!name) continue

    const edit = editedByName.get(name)
    if (edit) {
      processedNames.add(name)
      result.push({
        ...existingWorker,
        minimum: edit.minimum,
        maximum: edit.maximum,
        zones: edit.zones,
        machine: {
          ...(existingWorker as any).machine,
          type: edit.machineType,
          image: {
            name: edit.machineImage.name,
            version: edit.machineImage.version,
          },
        },
      })
    }
    // Existing workers not in edited are dropped (removal)
  }

  // Add new workers that didn't match any existing worker
  for (const w of edited) {
    if (!processedNames.has(w.name)) {
      result.push({
        name: w.name,
        minimum: w.minimum,
        maximum: w.maximum,
        zones: w.zones,
        machine: {
          type: w.machineType,
          image: {
            name: w.machineImage.name,
            version: w.machineImage.version,
          },
        },
      })
    }
  }

  return result
}

/**
 * Builds a merge-patch object for cluster update.
 * The patch is conditional on resourceVersion (409 on concurrent change).
 */
export function buildUpdatePatch(input: ClusterUpdateInput, currentShoot: Shoot): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    metadata: {
      resourceVersion: currentShoot.metadata.resourceVersion,
    },
    spec: {},
  }

  const spec = patch.spec as Record<string, unknown>

  if (input.kubernetesVersion) {
    spec.kubernetes = {
      version: input.kubernetesVersion,
    }
  }

  if (input.workers) {
    const currentSpec = (currentShoot.spec as any) || {}
    const currentWorkers = currentSpec.provider?.workers ?? []
    spec.provider = {
      workers: mergeWorkers(currentWorkers, input.workers),
    }
  }

  if (input.maintenance || input.autoUpdate) {
    const maintenance: Record<string, unknown> = {}
    if (input.maintenance) {
      maintenance.timeWindow = {
        begin: toGardenerTime(input.maintenance.startTime, input.maintenance.timezone),
        end: toGardenerTime(input.maintenance.endTime, input.maintenance.timezone),
      }
    }
    if (input.autoUpdate) {
      maintenance.autoUpdate = {
        machineImageVersion: input.autoUpdate.os,
        kubernetesVersion: input.autoUpdate.kubernetes,
      }
    }
    spec.maintenance = maintenance
  }

  return patch
}

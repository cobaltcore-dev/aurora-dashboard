import { z } from "zod"

// Helper schemas (assuming these are defined elsewhere as in your provided code)
const metadataLabelsSchema = z.record(z.string()).optional()
const metadataAnnotationsSchema = z.record(z.string()).optional()

// Condition schema
const conditionSchema = z.object({
  type: z.string(),
  status: z.enum(["True", "False", "Unknown", "Progressing"]),
  lastTransitionTime: z.string(),
  lastUpdateTime: z.string(),
  reason: z.string(),
  message: z.string(),
})

// LastOperation schema
const lastOperationSchema = z.object({
  description: z.string(),
  lastUpdateTime: z.string(),
  progress: z.number().min(0).max(100),
  state: z.enum(["Succeeded", "Processing", "Failed", "Pending", "Error", "Aborted"]),
  type: z.enum(["Create", "Reconcile", "Delete", "Migrate", "Restore"]),
})

// LastError schema
const lastErrorSchema = z.object({
  description: z.string(),
  taskID: z.string().optional(),
  codes: z.array(z.string()).optional(),
  lastUpdateTime: z.string().optional(),
})

// Worker schema
const workerSchema = z.object({
  cri: z.object({
    name: z.string(),
  }),
  name: z.string(),
  machine: z.object({
    type: z.string(),
    image: z.object({
      name: z.string(),
      version: z.string(),
    }),
    architecture: z.enum(["amd64", "arm64"]),
  }),
  maximum: z.number().int().positive(),
  minimum: z.number().int().min(0),
  maxSurge: z.number().int().min(0),
  maxUnavailable: z.number().int().min(0),
  zones: z.array(z.string()),
  systemComponents: z.object({
    allow: z.boolean(),
  }),
  updateStrategy: z.enum(["RollingUpdate", "AutoRollingUpdate"]),
})

// Extensions schema
const extensionSchema = z.object({
  type: z.string(),
  providerConfig: z.record(z.any()).optional(),
})

// ShootSpec schema (without kind and apiVersion)
export const shootItemSchema = z.object({
  metadata: z.object({
    name: z.string(),
    namespace: z.string(),
    uid: z.string().uuid(),
    resourceVersion: z.string(),
    generation: z.number().int().positive(),
    creationTimestamp: z.string().datetime(),
    labels: metadataLabelsSchema,
    annotations: metadataAnnotationsSchema,
    finalizers: z.array(z.string()).optional(),
  }),
  spec: z.object({
    addons: z
      .object({
        kubernetesDashboard: z
          .object({
            enabled: z.boolean(),
            authenticationMode: z.string(),
          })
          .optional(),
        nginxIngress: z
          .object({
            enabled: z.boolean(),
            externalTrafficPolicy: z.string(),
          })
          .optional(),
      })
      .optional(),
    cloudProfileName: z.string(),
    dns: z.object({
      domain: z.string(),
    }),
    extensions: z.array(extensionSchema).optional(),
    hibernation: z
      .object({
        schedules: z.array(
          z.object({
            start: z.string(),
            location: z.string(),
          })
        ),
      })
      .optional(),
    kubernetes: z.object({
      kubeAPIServer: z
        .object({
          requests: z
            .object({
              maxNonMutatingInflight: z.number().int().positive().optional(),
              maxMutatingInflight: z.number().int().positive().optional(),
            })
            .optional(),
          enableAnonymousAuthentication: z.boolean().optional(),
          eventTTL: z.string().optional(),
          logging: z
            .object({
              verbosity: z.number().int().min(0).max(9).optional(),
            })
            .optional(),
          defaultNotReadyTolerationSeconds: z.number().int().positive().optional(),
          defaultUnreachableTolerationSeconds: z.number().int().positive().optional(),
        })
        .optional(),
      kubeControllerManager: z
        .object({
          nodeCIDRMaskSize: z.number().int().positive().optional(),
          nodeMonitorGracePeriod: z.string().optional(),
        })
        .optional(),
      kubeScheduler: z
        .object({
          profile: z.string().optional(),
        })
        .optional(),
      kubeProxy: z
        .object({
          mode: z.string().optional(),
          enabled: z.boolean().optional(),
        })
        .optional(),
      kubelet: z
        .object({
          failSwapOn: z.boolean().optional(),
          kubeReserved: z.record(z.string()).optional(),
          imageGCHighThresholdPercent: z.number().int().min(0).max(100).optional(),
          imageGCLowThresholdPercent: z.number().int().min(0).max(100).optional(),
          serializeImagePulls: z.boolean().optional(),
        })
        .optional(),
      version: z.string(),
      verticalPodAutoscaler: z
        .object({
          enabled: z.boolean(),
          evictAfterOOMThreshold: z.string().optional(),
          evictionRateBurst: z.number().int().optional(),
          evictionRateLimit: z.number().optional(),
          evictionTolerance: z.number().optional(),
          recommendationMarginFraction: z.number().optional(),
          updaterInterval: z.string().optional(),
          recommenderInterval: z.string().optional(),
          targetCPUPercentile: z.number().optional(),
          recommendationLowerBoundCPUPercentile: z.number().optional(),
          recommendationUpperBoundCPUPercentile: z.number().optional(),
          targetMemoryPercentile: z.number().optional(),
          recommendationLowerBoundMemoryPercentile: z.number().optional(),
          recommendationUpperBoundMemoryPercentile: z.number().optional(),
          cpuHistogramDecayHalfLife: z.string().optional(),
          memoryHistogramDecayHalfLife: z.string().optional(),
          memoryAggregationInterval: z.string().optional(),
          memoryAggregationIntervalCount: z.number().int().optional(),
        })
        .optional(),
    }),
    networking: z.object({
      type: z.string(),
      providerConfig: z
        .object({
          overlay: z
            .object({
              enabled: z.boolean(),
            })
            .optional(),
        })
        .optional(),
      pods: z.string(),
      nodes: z.string(),
      services: z.string(),
      ipFamilies: z.array(z.enum(["IPv4", "IPv6"])),
    }),
    maintenance: z
      .object({
        autoUpdate: z.object({
          kubernetesVersion: z.boolean(),
          machineImageVersion: z.boolean(),
        }),
        timeWindow: z.object({
          begin: z.string(),
          end: z.string(),
        }),
      })
      .optional(),
    provider: z.object({
      type: z.string(),
      controlPlaneConfig: z.record(z.any()),
      infrastructureConfig: z.record(z.any()),
      workers: z.array(workerSchema),
      workersSettings: z
        .object({
          sshAccess: z
            .object({
              enabled: z.boolean(),
            })
            .optional(),
        })
        .optional(),
    }),
    purpose: z.string().optional(),
    region: z.string(),
    secretBindingName: z.string(),
    seedName: z.string(),
    systemComponents: z
      .object({
        coreDNS: z
          .object({
            autoscaling: z.object({
              mode: z.string(),
            }),
          })
          .optional(),
        nodeLocalDNS: z
          .object({
            enabled: z.boolean(),
            forceTCPToUpstreamDNS: z.boolean(),
          })
          .optional(),
      })
      .optional(),
    schedulerName: z.string().optional(),
    cloudProfile: z
      .object({
        kind: z.string(),
        name: z.string(),
      })
      .optional(),
  }),
  status: z
    .object({
      conditions: z.array(conditionSchema).optional(),
      constraints: z.array(conditionSchema).optional(),
      gardener: z
        .object({
          id: z.string(),
          name: z.string(),
          version: z.string(),
        })
        .optional(),
      hibernated: z.boolean().optional(),
      lastOperation: lastOperationSchema.optional(),
      lastErrors: z.array(lastErrorSchema).optional(),
      observedGeneration: z.number().int().positive().optional(),
      seedName: z.string().optional(),
      technicalID: z.string().optional(),
      uid: z.string().uuid().optional(),
      clusterIdentity: z.string().optional(),
      lastMaintenance: z
        .object({
          description: z.string(),
          triggeredTime: z.string(),
          state: z.string(),
        })
        .optional(),
    })
    .optional(),
})

export const shootListSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: z.object({
    resourceVersion: z.string(),
    selfLink: z.string(),
  }),
  items: z.array(shootItemSchema),
})

// Type definitions derived from the schemas
export type ShootItem = z.infer<typeof shootItemSchema>

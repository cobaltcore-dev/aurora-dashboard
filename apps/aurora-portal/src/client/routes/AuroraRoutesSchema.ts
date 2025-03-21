import { z } from "zod"
import { AllowedComputeRoutes, AllowedNetworkRoutes, AuroraDomainNavigationRoutes } from "./constants"

// Utility to convert routes to Zod objects
const createRoutesSchema = <T extends readonly string[]>(routes: T) =>
  z.object(Object.fromEntries(routes.map((route) => [route, z.string()])) as Record<T[number], z.ZodString>)

// Schemas
export const DomainIdSchema = z.string().min(1).default(":domainId")
export const ProjectIdSchema = z.string().min(1).default(":projectId")
export const SubRouteSchema = z.string().min(1)

export const AuroraDomainNavigationSchema = createRoutesSchema(AuroraDomainNavigationRoutes)
export const ComputeRoutesSchema = createRoutesSchema(AllowedComputeRoutes)
export const NetworkRoutesSchema = createRoutesSchema(AllowedNetworkRoutes)

// Base Routes
const RouteSchema = z.object({
  auth: z.object({ signin: z.literal("auth/signin") }),
  home: z.literal("/"),
  about: z.literal("/about"),
})

// Project Schema
export const ProjectSchema = z
  .function()
  .args(ProjectIdSchema)
  .returns(
    AuroraDomainNavigationSchema.extend({
      root: z.string(),
      compute: ComputeRoutesSchema.extend({
        root: z.string(),
      }),
      network: NetworkRoutesSchema.extend({
        root: z.string(),
      }),
    })
  )

// Domain Schema
export const DomainSchema = z
  .function()
  .args(DomainIdSchema)
  .returns(
    z.object({
      root: z.string(),
      projects: z.string(),
      project: ProjectSchema,
    })
  )

// Final Schema
export const AuroraRouteSchema = RouteSchema.extend({
  domain: DomainSchema,
  extensions: z.function().args(z.string()).returns(z.string()).optional(),
})

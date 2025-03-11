import { z } from "zod"

// Define the schema for individual routes
const RouteSchema = z.object({
  path: z.string(),
  label: z.string(),
})

// Define a nested structure for domain-based routing
const RoutesSchema = z.object({
  home: RouteSchema,
  about: RouteSchema,
  auth: z.object({
    signin: RouteSchema,
  }),
  domain: z.object({
    overview: RouteSchema,
    projects: RouteSchema,
    project: z.object({
      compute: RouteSchema,
      network: RouteSchema,
      storage: RouteSchema,
      metrics: RouteSchema,
    }),
  }),
})

// TypeScript type for safer access
type RoutesType = z.infer<typeof RoutesSchema>

// Define all routes with placeholders for dynamic params
export const routes: RoutesType = {
  home: { path: "/", label: "Home" },
  about: { path: "/about", label: "About" },
  auth: {
    signin: { path: "/auth/signin", label: "Sign In" },
  },
  domain: {
    overview: { path: "/:domainId", label: "Domain Overview" },
    projects: { path: "/:domainId/projects", label: "Projects" },
    project: {
      compute: { path: "/:domainId/projects/:projectId/compute", label: "Compute" },
      network: { path: "/:domainId/projects/:projectId/network", label: "Network" },
      storage: { path: "/:domainId/projects/:projectId/storage", label: "Storage" },
      metrics: { path: "/:domainId/projects/:projectId/metrics", label: "Metrics" },
    },
  },
}

// Ensure the object is valid at runtime
RoutesSchema.parse(routes)

import { AuroraRoutesSchema, DomainIdSchema, ProjectIdSchema, SubRouteSchema } from "./AuroraRoutesSchema"
import { AllowedComputeRoutes, AllowedMetricsRoutes, AllowedNetworkRoutes, AllowedStorageRoutes } from "./constants"

// Create router function with parse methods
export function createRoutePaths(extensions?: readonly string[]) {
  const auroraRoutePaths = () => {
    return AuroraRoutesSchema.parse({
      auth: {
        signin: "auth/signin",
      },
      home: "/",
      about: "/about",
      domain: (domainIdParam?: string) => {
        const domainId = DomainIdSchema.parse(domainIdParam)

        return {
          root: `/accounts/${domainId}`,
          projects: `/accounts/${domainId}/projects`,
          project: (projectIdParam?: string) => {
            const projectId = ProjectIdSchema.parse(projectIdParam)

            const withinProject = (path: string) => `/accounts/${domainId}/projects/${projectId}/${path}`

            const withSubRoute = (base: string, allowedRoutes: readonly string[]) =>
              Object.fromEntries(allowedRoutes.map((route) => [route, withinProject(`${base}/${route}`)]))

            return {
              root: withinProject(""),
              compute: {
                root: withinProject("compute"),
                ...withSubRoute("compute", AllowedComputeRoutes),
              },
              network: {
                root: withinProject("network"),
                ...withSubRoute("network", AllowedNetworkRoutes),
              },
              metrics: {
                root: withinProject("metrics"),
                ...withSubRoute("metrics", AllowedMetricsRoutes),
              },
              storage: {
                root: withinProject("storage"),
                ...withSubRoute("storage", AllowedStorageRoutes),
              },
            }
          },
        }
      },
      extensions: extensions
        ? (extId: string) => {
            SubRouteSchema.parse(extId)
            return `/extensions/${extensions?.join("/")}/${extId}`
          }
        : undefined,
    })
  }

  return { auroraRoutePaths }
}

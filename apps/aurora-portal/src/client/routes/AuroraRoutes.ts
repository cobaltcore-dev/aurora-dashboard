import { AuroraRouteSchema, DomainIdSchema, ProjectIdSchema, SubRouteSchema } from "./AuroraRoutesSchema"
import { AllowedComputeRoutes, AllowedNetworkRoutes } from "./constants"

// Create router function with parse methods
export function createRouter(extensions?: readonly string[]) {
  const auroraRouter = () => {
    return AuroraRouteSchema.parse({
      auth: {
        signin: "auth/signin",
      },
      home: "/",
      about: "/about",
      domain: (domainIdParam?: string) => {
        const domainId = DomainIdSchema.parse(domainIdParam)

        const withinDomain = (path: string) => `/${domainId}/${path}`

        return {
          root: `/${domainId}`,
          projects: withinDomain("projects"),
          project: (projectIdParam?: string) => {
            const projectId = ProjectIdSchema.parse(projectIdParam)

            const withinProject = (path: string) => `/${domainId}/${projectId}/${path}`

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

  return { auroraRouter }
}

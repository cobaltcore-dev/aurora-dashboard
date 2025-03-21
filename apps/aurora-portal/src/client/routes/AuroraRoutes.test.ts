import { describe, it, expect } from "vitest"
import { createRoutePaths } from "./AuroraRoutes"

// Test constants
const domainId = "myDomain"
const projectId = "myProject"

describe("AuroraRouter:", () => {
  it("should correctly generate root, auth, home, and about routes", () => {
    const router = createRoutePaths()
    const { auroraRoutePaths } = router
    const rootRouter = auroraRoutePaths()

    expect(rootRouter.auth.signin).toBe("auth/signin")
    expect(rootRouter.home).toBe("/")
    expect(rootRouter.about).toBe("/about")
  })

  it("should generate correct domain and project routes", () => {
    const router = createRoutePaths()
    const { auroraRoutePaths } = router
    const domainRouter = auroraRoutePaths().domain(domainId)
    const projectRouter = domainRouter.project(projectId)

    expect(domainRouter.root).toBe(`/${domainId}`)
    expect(domainRouter.projects).toBe("/projects")
    expect(projectRouter.root).toBe(`/${domainId}/${projectId}/`)
    expect(projectRouter.compute.root).toBe(`/${domainId}/${projectId}/compute`)
    expect(projectRouter.network.root).toBe(`/${domainId}/${projectId}/network`)
  })

  it("should generate valid compute and network subroutes", () => {
    const router = createRoutePaths()
    const { auroraRoutePaths } = router
    const projectRouter = auroraRoutePaths().domain(domainId).project(projectId)

    expect(projectRouter.compute.instances).toBe(`/${domainId}/${projectId}/compute/instances`)
    expect(projectRouter.network.firewall).toBe(`/${domainId}/${projectId}/network/firewall`)
  })

  it("should validate invalid domain and project ids", () => {
    const router = createRoutePaths()
    const { auroraRoutePaths } = router

    expect(() => auroraRoutePaths().domain("")).toThrowError()
    expect(() => auroraRoutePaths().domain(domainId).project("")).toThrowError()
  })

  it("should generate correct extension routes when extensions are provided", () => {
    const router = createRoutePaths(["alpha", "beta"])
    const { auroraRoutePaths } = router
    const extensionRoute = auroraRoutePaths().extensions?.("extension1")

    expect(extensionRoute).toBe("/extensions/alpha/beta/extension1")
  })

  it("should throw an error if invalid subroute is provided for extensions", () => {
    const router = createRoutePaths(["alpha"])
    const { auroraRoutePaths } = router

    expect(() => auroraRoutePaths().extensions?.("")).toThrowError()
  })
})

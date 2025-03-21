import { describe, it, expect } from "vitest"
import { createRouter } from "./AuroraRoutes"

// Test constants
const domainId = "myDomain"
const projectId = "myProject"

describe("AuroraRouter:", () => {
  it("should correctly generate root, auth, home, and about routes", () => {
    const router = createRouter()
    const { auroraRouter } = router
    const rootRouter = auroraRouter()

    expect(rootRouter.auth.signin).toBe("auth/signin")
    expect(rootRouter.home).toBe("/")
    expect(rootRouter.about).toBe("/about")
  })

  it("should generate correct domain and project routes", () => {
    const router = createRouter()
    const { auroraRouter } = router
    const domainRouter = auroraRouter().domain(domainId)
    const projectRouter = domainRouter.project(projectId)

    expect(domainRouter.root).toBe(`/${domainId}`)
    expect(domainRouter.projects).toBe(`/${domainId}/projects`)
    expect(projectRouter.root).toBe(`/${domainId}/${projectId}/`)
    expect(projectRouter.compute.root).toBe(`/${domainId}/${projectId}/compute`)
    expect(projectRouter.network.root).toBe(`/${domainId}/${projectId}/network`)
  })

  it("should generate valid compute and network subroutes", () => {
    const router = createRouter()
    const { auroraRouter } = router
    const projectRouter = auroraRouter().domain(domainId).project(projectId)

    expect(projectRouter.compute.instances).toBe(`/${domainId}/${projectId}/compute/instances`)
    expect(projectRouter.network.firewall).toBe(`/${domainId}/${projectId}/network/firewall`)
  })

  it("should validate invalid domain and project ids", () => {
    const router = createRouter()
    const { auroraRouter } = router

    expect(() => auroraRouter().domain("")).toThrowError()
    expect(() => auroraRouter().domain(domainId).project("")).toThrowError()
  })

  it("should generate correct extension routes when extensions are provided", () => {
    const router = createRouter(["alpha", "beta"])
    const { auroraRouter } = router
    const extensionRoute = auroraRouter().extensions?.("extension1")

    expect(extensionRoute).toBe("/extensions/alpha/beta/extension1")
  })

  it("should throw an error if invalid subroute is provided for extensions", () => {
    const router = createRouter(["alpha"])
    const { auroraRouter } = router

    expect(() => auroraRouter().extensions?.("")).toThrowError()
  })
})

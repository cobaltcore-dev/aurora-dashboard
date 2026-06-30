import type { AnyRouter } from "@trpc/server"

export interface AuroraServerConfig {
  bffEndpoint?: string
  viteRoot?: string
  identityEndpoint?: string
  defaultEndpointInterface?: string
  proxyUrl?: string
  /** S3/Ceph region identifier for object storage operations */
  cephRegion?: string
  /**
   * Comma-separated list of image metadata property keys to hide in the UI.
   * Example: "hypervisor_type,hw_disk_bus"
   */
  imageMetadataExcludedProperties?: string
  /** Override the session cookie name. Default: "dashboard-session-auth" */
  cookieName?: string
  /** Allow cookies across subdomains. Default: true */
  crossDomainCookie?: boolean
  /**
   * Disable the `Secure` flag on cookies (for HTTP-only local dev environments).
   * Never set this in production.
   */
  insecureCookies?: boolean
  /**
   * Hostname used for cookie domain extraction (e.g., "dashboard-aurora.qa-de-1.cloud.sap").
   * When set, this overrides req.hostname for determining the cookie domain.
   * Use this when running behind a proxy to ensure correct cross-domain cookie sharing.
   */
  cookieHost?: string
  /**
   * Absolute path to a directory containing consumer-supplied OpenStack policy
   * files (e.g. compute.yaml, image.yaml).  Files found here take precedence
   * over the legacy in-tree permission_custom_policies/ directory.
   */
  policyDir: string
  /**
   * Additional tRPC routers to merge into the Aurora router at startup.
   *
   * Routers passed here share the same Fastify request context as the built-in
   * Aurora routers (session cookies, OpenStack client, rescoping helpers).
   *
   * **Requirements:**
   * - Routers MUST be created with the `auroraRouter` function exported from
   *   `@cobaltcore-dev/aurora/server`. Using a different `initTRPC` instance
   *   produces an incompatible context type and will cause runtime failures when
   *   procedures attempt to access `ctx.openstack`, `ctx.validateSession`, etc.
   * - Use `protectedProcedure` (or `projectScopedProcedure` /
   *   `domainScopedProcedure`) for any procedure that requires an authenticated
   *   session. All of these are exported from `@cobaltcore-dev/aurora/server`.
   *
   * @example
   * ```ts
   * import { auroraRouter, protectedProcedure, createServer } from "@cobaltcore-dev/aurora/server"
   * import { z } from "zod"
   *
   * const customRouter = auroraRouter({
   *   feedback: protectedProcedure
   *     .input(z.object({ message: z.string() }))
   *     .mutation(async ({ input }) => ({ status: "received" })),
   * })
   *
   * createServer({ ..., routers: [customRouter] })
   * ```
   */
  routers?: AnyRouter[]
}

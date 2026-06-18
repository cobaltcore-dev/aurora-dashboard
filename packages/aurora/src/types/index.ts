import type { Registry } from "prom-client"

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
   * Absolute path to a directory containing consumer-supplied OpenStack policy
   * files (e.g. compute.yaml, image.yaml).  Files found here take precedence
   * over the legacy in-tree permission_custom_policies/ directory.
   */
  policyDir: string
  /**
   * Optional Prometheus registry for metrics collection.
   * If provided, Aurora will use this registry for all metrics (Phase 1).
   * Consumers can add their own metrics (Phase 2) to the same registry
   * and have them appear in the unified /metrics endpoint.
   * If not provided, Aurora creates its own internal registry.
   */
  metricsRegistry?: Registry
}

// Constants
export const AuroraDomainNavigationRoutes = ["compute", "network", "storage", "metrics"] as const
export const AllowedStorageRoutes = ["volumes", "snapshots", "backups"] as const
export const AllowedMetricsRoutes = ["overview", "cpu", "memory", "disk", "network"] as const
export const AllowedComputeRoutes = ["overview", "instances", "images", "keypairs", "servergroups"] as const
export const AllowedNetworkRoutes = ["firewall", "loadBalancers", "privateNetworks", "publicIPs"] as const

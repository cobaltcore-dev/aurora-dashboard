import {
  createFileRoute,
  Outlet,
  redirect,
  isRedirect,
  useMatches,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { Button, Stack, Status, TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { hasManilaService } from "@/types/sharedFileSystem"
import { useSharedFileSystemPermissions } from "@/client/hooks/useSharedFileSystemPermissions"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteError } from "@/client/components/Errors/RouteError"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    crumb: { text: msg`Shared File System` },
  } satisfies RouteInfo,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient, enabledServices, deniedServices } = context
    const { projectId } = params
    const isEnabled =
      (!enabledServices || enabledServices.includes("shared-file-system")) &&
      !deniedServices?.includes("shared-file-system")
    if (!isEnabled) {
      throw redirect({ to: "/projects/$projectId", params: { projectId } })
    }
    try {
      const services = await trpcClient?.auth.getAvailableServices.query()
      if (!hasManilaService(services ?? [])) {
        throw redirect({ to: "/projects/$projectId", params: { projectId } })
      }
    } catch (err) {
      if (isRedirect(err)) throw err
      throw redirect({ to: "/projects/$projectId", params: { projectId } })
    }
  },
  component: SharedFileSystemLayout,
  errorComponent: SharedFileSystemScopeError,
})

function SharedFileSystemScopeError({ error }: { error: unknown }) {
  const router = useRouter()
  const { t } = useLingui()
  const code = (error as { data?: { code?: string } } | undefined)?.data?.code
  if (code === "FORBIDDEN")
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view shared file systems in this project.`}
      />
    )
  return (
    <Stack direction="vertical">
      <RouteError
        error={error}
        title={code === "UNAUTHORIZED" ? t`Session Expired` : t`Failed to Load Shared File System`}
      />
      <Button size="xs" label={t`Try again`} onClick={() => void router.invalidate()} />
    </Stack>
  )
}

type MatchRouteId = { routeId: string }

function resolveSharedFileSystemAccess(
  matches: MatchRouteId[],
  permissions: ReturnType<typeof useSharedFileSystemPermissions>
): boolean {
  const inShareNetworks = matches.some((m) => m.routeId.includes("/share-networks"))
  const inSecurityServices = matches.some((m) => m.routeId.includes("/security-services"))
  const isShareDetail = matches.some((m) => m.routeId.includes("$shareId"))
  const isSnapshotDetail = matches.some((m) => m.routeId.includes("$snapshotId"))
  const isShareNetworkDetail = matches.some((m) => m.routeId.includes("$shareNetworkId"))
  const isSecurityServiceDetail = matches.some((m) => m.routeId.includes("$securityServiceId"))

  if (inShareNetworks) {
    return isShareNetworkDetail ? permissions.canReadShareNetworks : permissions.canListShareNetworks
  }
  if (inSecurityServices) {
    return isSecurityServiceDetail ? permissions.canReadSecurityServices : permissions.canListSecurityServices
  }
  // Shares section
  if (isSnapshotDetail) return permissions.canReadSnapshots
  if (isShareDetail) return permissions.canReadShares
  return permissions.canListShares
}

const TAB_PATHS = {
  shares: "/projects/$projectId/shared-file-system",
  "share-networks": "/projects/$projectId/shared-file-system/share-networks",
  "security-services": "/projects/$projectId/shared-file-system/security-services",
} as const

function SharedFileSystemLayout() {
  const { projectId } = Route.useParams()
  const { t } = useLingui()
  const navigate = useNavigate()
  const matches = useMatches()
  const isDetail = matches.some((m) =>
    ["$shareId", "$snapshotId", "$shareNetworkId", "$securityServiceId"].some((p) => m.routeId.includes(p))
  )
  const tab = matches.some((m) => m.routeId.includes("/shared-file-system/share-networks"))
    ? "share-networks"
    : matches.some((m) => m.routeId.includes("/shared-file-system/security-services"))
      ? "security-services"
      : "shares"
  const permissions = useSharedFileSystemPermissions(projectId)
  const canAccess = resolveSharedFileSystemAccess(matches, permissions)

  if (permissions.isPending) return <Status status="progress" title={t`Loading Shared File System...`} />
  if (permissions.error?.data?.code === "FORBIDDEN")
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view shared file systems in this project.`}
      />
    )
  if (permissions.error)
    return (
      <Stack direction="vertical">
        <RouteError
          error={permissions.error}
          title={
            permissions.error.data?.code === "UNAUTHORIZED" ? t`Session Expired` : t`Failed to Load Shared File System`
          }
        />
        <Button size="xs" label={t`Try again`} onClick={() => void permissions.refetch()} />
      </Stack>
    )
  if (!isDetail && !permissions.canListAny)
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view shared file systems in this project.`}
      />
    )

  const accessDeniedBody = (() => {
    if (matches.some((m) => m.routeId.includes("/share-networks"))) {
      return t`You don't have permission to view share networks in this project.`
    }
    if (matches.some((m) => m.routeId.includes("/security-services"))) {
      return t`You don't have permission to view security services in this project.`
    }
    if (matches.some((m) => m.routeId.includes("$snapshotId"))) {
      return t`You don't have permission to view snapshots in this project.`
    }
    return t`You don't have permission to view shares in this project.`
  })()

  return (
    <div>
      {!isDetail && (
        <>
          <ContentHeader title={t`Shared File System`} projectId={projectId} />
          <TabBar
            appearance="tabs"
            ariaLabel={t`Shared file system resources`}
            activeItem={tab}
            onActiveItemChange={(value) => {
              void navigate({
                to: TAB_PATHS[String(value) as keyof typeof TAB_PATHS],
                params: { projectId },
              })
            }}
          >
            <TabBarItem label={t`Shares`} value="shares" />
            <TabBarItem label={t`Share Networks`} value="share-networks" />
            <TabBarItem label={t`Security Services`} value="security-services" />
          </TabBar>
        </>
      )}
      <div className="mt-4">
        {canAccess ? <Outlet /> : <Status status="error" title={t`Access Denied`} body={accessDeniedBody} />}
      </div>
    </div>
  )
}

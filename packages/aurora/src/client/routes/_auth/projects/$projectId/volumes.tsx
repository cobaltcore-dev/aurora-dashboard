import { createFileRoute, Outlet, redirect, useMatches, useNavigate, useRouter } from "@tanstack/react-router"
import { Button, Stack, Status, TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { useVolumePermissions } from "@/client/hooks/useVolumePermissions"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteError } from "@/client/components/Errors/RouteError"
import { SessionExpired } from "@/client/components/Errors/SessionExpired"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes")({
  staticData: { section: "block-storage", service: "volumes", crumb: { text: msg`Volumes` } } satisfies RouteInfo,
  beforeLoad: async ({ context, params }) => {
    const enabled =
      (!context.enabledServices || context.enabledServices.includes("volumes")) &&
      !context.deniedServices?.includes("volumes")
    if (!enabled) {
      throw redirect({ to: "/projects/$projectId", params: { projectId: params.projectId } })
    }
    const availability = await context.trpcClient?.volume.getAvailability.query({ project_id: params.projectId })
    if (!availability?.available) {
      throw redirect({ to: "/projects/$projectId", params: { projectId: params.projectId } })
    }
  },
  component: VolumeLayout,
  errorComponent: VolumeScopeError,
})

function VolumeScopeError({ error }: { error: unknown }) {
  const router = useRouter()
  const { t } = useLingui()
  const code = (error as { data?: { code?: string } } | undefined)?.data?.code
  if (code === "UNAUTHORIZED") return <SessionExpired />
  if (code === "FORBIDDEN")
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view block storage in this project.`}
      />
    )
  return (
    <Stack direction="vertical">
      <RouteError error={error} title={t`Failed to Load Volumes`} />
      <Button size="xs" label={t`Try again`} onClick={() => void router.invalidate()} />
    </Stack>
  )
}

function VolumeLayout() {
  const { projectId } = Route.useParams()
  const { t } = useLingui()
  const navigate = useNavigate()
  const matches = useMatches()
  const detail = matches.some((match) => match.routeId.includes("$volumeId") || match.routeId.includes("$snapshotId"))
  const snapshots = matches.some((match) => match.routeId.includes("/snapshots"))
  const permissions = useVolumePermissions(projectId)
  const canAccess = snapshots
    ? detail
      ? permissions.canReadSnapshots
      : permissions.canListSnapshots
    : detail
      ? permissions.canReadVolumes
      : permissions.canListVolumes
  if (permissions.isPending) return <Status status="progress" title={t`Loading Volumes...`} />
  if (permissions.error?.data?.code === "UNAUTHORIZED") return <SessionExpired />
  if (permissions.error?.data?.code === "FORBIDDEN")
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view block storage in this project.`}
      />
    )
  if (permissions.error)
    return (
      <Stack direction="vertical">
        <RouteError error={permissions.error} title={t`Failed to Load Volumes`} />
        <Button size="xs" label={t`Try again`} onClick={() => void permissions.refetch()} />
      </Stack>
    )
  // Detail read permissions are independent of list permissions.
  if (!detail && !permissions.canListVolumes && !permissions.canListSnapshots)
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view block storage in this project.`}
      />
    )
  return (
    <div>
      {!detail && (
        <>
          <ContentHeader title={t`Volumes`} projectId={projectId} />
          <TabBar
            ariaLabel={t`Block storage resources`}
            activeItem={snapshots ? "snapshots" : "volumes"}
            onActiveItemChange={(value) => {
              void navigate({
                to: value === "snapshots" ? "/projects/$projectId/volumes/snapshots" : "/projects/$projectId/volumes",
                params: { projectId },
              })
            }}
          >
            <TabBarItem label={t`Volumes`} value="volumes" />
            <TabBarItem label={t`Snapshots`} value="snapshots" />
          </TabBar>
        </>
      )}
      <div className="mt-4">
        {canAccess ? (
          <Outlet />
        ) : (
          <Status
            status="error"
            title={t`Access Denied`}
            body={
              snapshots
                ? t`You don't have permission to view snapshots in this project.`
                : t`You don't have permission to view volumes in this project.`
            }
          />
        )}
      </div>
    </div>
  )
}

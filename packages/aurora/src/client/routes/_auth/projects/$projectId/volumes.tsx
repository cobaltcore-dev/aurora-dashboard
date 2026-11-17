import { createFileRoute, Outlet, redirect, useMatches, useNavigate, useRouter } from "@tanstack/react-router"
import { TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { findCinderService } from "@/types/volume"
import { useVolumePermissions } from "@/client/hooks/useVolumePermissions"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { BlockStorageState } from "./volumes/-components/BlockStorageState"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes")({
  staticData: { section: "block-storage", service: "volumes", crumb: { text: msg`Volumes` } } satisfies RouteInfo,
  beforeLoad: async ({ context, params }) => {
    const enabled =
      (!context.enabledServices || context.enabledServices.includes("volumes")) &&
      !context.deniedServices?.includes("volumes")
    if (!enabled || !findCinderService((await context.trpcClient?.auth.getAvailableServices.query()) ?? [])) {
      throw redirect({ to: "/projects/$projectId", params: { projectId: params.projectId } })
    }
  },
  component: VolumeLayout,
  errorComponent: VolumeScopeError,
})

function VolumeScopeError({ error }: { error: unknown }) {
  const router = useRouter()
  return <BlockStorageState error={error} retry={() => void router.invalidate()} />
}

function VolumeLayout() {
  const { projectId } = Route.useParams()
  const { t } = useLingui()
  const navigate = useNavigate()
  const matches = useMatches()
  const detail = matches.some((match) => match.routeId.includes("$volumeId") || match.routeId.includes("$snapshotId"))
  const snapshots = matches.some((match) => match.routeId.includes("/snapshots"))
  const permissions = useVolumePermissions(projectId)
  if (permissions.isPending) return <BlockStorageState loading />
  if (permissions.error) return <BlockStorageState error={permissions.error} retry={() => void permissions.refetch()} />
  // Detail read permissions are independent of list permissions.
  if (!detail && !permissions.canListVolumes && !permissions.canListSnapshots) return <BlockStorageState denied />
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
        <Outlet />
      </div>
    </div>
  )
}

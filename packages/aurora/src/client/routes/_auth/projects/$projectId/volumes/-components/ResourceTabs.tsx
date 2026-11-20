import { TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"

export function ResourceTabs({ projectId, snapshots = false }: { projectId: string; snapshots?: boolean }) {
  const { t } = useLingui()
  const navigate = useNavigate()

  return (
    <TabBar
      ariaLabel={t`Block storage resources`}
      appearance="content"
      activeItem={snapshots ? "snapshots" : "volumes"}
      onActiveItemChange={(value) => {
        void navigate({
          to: value === "snapshots" ? "/projects/$projectId/volumes/snapshots" : "/projects/$projectId/volumes",
          params: { projectId },
        })
      }}
    >
      <TabBarItem label={t`Volumes`} value="volumes" active={!snapshots} />
      <TabBarItem label={t`Snapshots`} value="snapshots" active={snapshots} />
    </TabBar>
  )
}

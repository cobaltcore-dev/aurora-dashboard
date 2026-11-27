import { TabBar, TabBarItem } from "@cloudoperators/juno-ui-components"
import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"

export function ResourceTabs({ projectId, snapshots = false }: { projectId: string; snapshots?: boolean }) {
  const { t } = useLingui()
  const navigate = useNavigate()

  return (
    <TabBar
      appearance="tabs"
      ariaLabel={t`Block storage resources`}
      activeItem={snapshots ? "snapshots" : "volumes"}
      onActiveItemChange={(value) => {
        if (value !== "volumes" && value !== "snapshots") return
        void navigate({
          to: value === "snapshots" ? "/projects/$projectId/volumes/snapshots" : "/projects/$projectId/volumes",
          params: { projectId },
        })
      }}
    >
      <TabBarItem label={t`Volumes`} value="volumes" />
      <TabBarItem label={t`Snapshots`} value="snapshots" />
    </TabBar>
  )
}

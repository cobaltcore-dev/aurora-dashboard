import { useLingui } from "@lingui/react/macro"
import { TabNavigation, TabNavigationItem } from "@cloudoperators/juno-ui-components"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects"

/**
 * Tab navigation for bucket detail page
 *
 * Provides three tabs:
 * - Overview: object browser (default)
 * - CORS Rules: CORS configuration management
 * - Lifecycle Rules: lifecycle configuration management
 *
 * Tab state is persisted in the URL via the `view` search param.
 */
export const BucketDetailTabs = () => {
  const { t } = useLingui()
  const navigate = Route.useNavigate()
  const { view } = Route.useSearch()

  return (
    <TabNavigation>
      <TabNavigationItem
        label={t`Overview`}
        active={view === "overview"}
        onClick={() => {
          navigate({
            search: (prev) => ({
              ...prev,
              view: "overview",
            }),
          })
        }}
      />
      <TabNavigationItem
        label={t`CORS Rules`}
        active={view === "cors-rules"}
        onClick={() => {
          navigate({
            search: (prev) => ({
              ...prev,
              view: "cors-rules",
            }),
          })
        }}
      />
      <TabNavigationItem
        label={t`Lifecycle Rules`}
        active={view === "lifecycle-rules"}
        onClick={() => {
          navigate({
            search: (prev) => ({
              ...prev,
              view: "lifecycle-rules",
            }),
          })
        }}
      />
    </TabNavigation>
  )
}

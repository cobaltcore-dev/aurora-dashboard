import { Breadcrumb, BreadcrumbItem as JunoBreadcrumbItem } from "@cloudoperators/juno-ui-components"
import type { KnownIcons } from "@cloudoperators/juno-ui-components"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useContext, useMemo } from "react"
import { BreadcrumbExtensionContext } from "@/client/context/BreadcrumbExtensionContext"
import { useBreadcrumbs, type BreadcrumbItem } from "@/client/hooks/useBreadcrumbs"

export function Breadcrumbs() {
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false }) as { projectId?: string }
  const { breadcrumbs: extensionCrumbs } = useContext(BreadcrumbExtensionContext)
  const breadcrumbs = useBreadcrumbs()

  const allBreadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (extensionCrumbs.length === 0 || breadcrumbs.length === 0) return breadcrumbs

    // Extension crumbs present: deactivate the last OSS crumb (always the project crumb on
    // /services/* routes) and append the extension crumbs pushed by the sub-app.
    return [
      ...breadcrumbs.slice(0, -1),
      {
        ...breadcrumbs[breadcrumbs.length - 1],
        active: false,
        onClick: projectId
          ? () => navigate({ to: "/projects/$projectId" as never, params: { projectId } as never })
          : undefined,
      },
      ...extensionCrumbs,
    ]
  }, [breadcrumbs, extensionCrumbs, projectId, navigate])

  return (
    <Breadcrumb className="relative z-1 mt-8 mb-4">
      {allBreadcrumbs.map((item, index) => (
        <JunoBreadcrumbItem
          key={index}
          label={item.label}
          icon={item.icon as KnownIcons | undefined}
          onClick={item.onClick}
          active={item.active}
        />
      ))}
    </Breadcrumb>
  )
}

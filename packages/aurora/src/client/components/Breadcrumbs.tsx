import { Breadcrumb, BreadcrumbItem as JunoBreadcrumbItem } from "@cloudoperators/juno-ui-components"
import type { KnownIcons } from "@cloudoperators/juno-ui-components"
import { useMatches, useNavigate, useParams } from "@tanstack/react-router"
import { useContext, useMemo } from "react"
import { BreadcrumbExtensionContext } from "@/client/context/BreadcrumbExtensionContext"
import { useBreadcrumbs, type BreadcrumbItem } from "@/client/hooks/useBreadcrumbs"

export function Breadcrumbs() {
  const navigate = useNavigate()
  const matches = useMatches()
  const { projectId } = useParams({ strict: false }) as { projectId?: string }
  const { breadcrumbs: extensionCrumbs } = useContext(BreadcrumbExtensionContext)
  const breadcrumbs = useBreadcrumbs()

  const allBreadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (extensionCrumbs.length === 0) return breadcrumbs

    // Extension crumbs are present: deactivate the last useBreadcrumbs item (service label crumb),
    // give it an onClick to navigate back to the service root, then append the extension crumbs.
    const deepest = matches[matches.length - 1]
    const anyParams = deepest?.params as Record<string, string> | undefined

    return [
      ...breadcrumbs.slice(0, -1),
      {
        ...breadcrumbs[breadcrumbs.length - 1],
        active: false,
        onClick:
          anyParams?.serviceType && projectId
            ? () =>
                navigate({
                  to: "/projects/$projectId/services/$serviceType" as never,
                  params: { projectId: projectId!, serviceType: anyParams.serviceType! } as never,
                })
            : breadcrumbs[breadcrumbs.length - 1]?.onClick,
      },
      ...extensionCrumbs,
    ]
  }, [breadcrumbs, extensionCrumbs, matches, projectId, navigate])

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

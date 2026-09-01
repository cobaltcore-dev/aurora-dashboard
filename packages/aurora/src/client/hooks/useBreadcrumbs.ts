import { useMatches, useNavigate, useParams, useRouteContext } from "@tanstack/react-router"
import { useMemo, useContext } from "react"
import { useLingui } from "@lingui/react/macro"
import type { I18n } from "@lingui/core"
import type { MessageDescriptor } from "@lingui/core"
import { isRouteInfo, type RouteInfo } from "@/client/routes/routeInfo"
import { DynamicBreadcrumbContext } from "@/client/context/DynamicBreadcrumbContext"

/**
 * Returns the ordered breadcrumb chain for the current route.
 * Reads static crumbs from route staticData and dynamic crumbs from useSetBreadcrumb.
 * Works with any TanStack Router instance — suitable for embedded sub-apps (e.g. SCI services).
 *
 * Requirements:
 * - Must be rendered inside DynamicBreadcrumbProvider and a lingui I18nProvider
 * - To include SCI extension crumbs in OSS, use the Breadcrumbs component which merges BreadcrumbExtensionContext
 */
export type BreadcrumbItem = {
  label?: string
  icon?: string
  onClick?: () => void
  active?: boolean
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const matches = useMatches()
  const { projectId } = useParams({ strict: false }) as { projectId?: string }
  const { additionalProjectServices } = useRouteContext({ strict: false }) as {
    additionalProjectServices?: Array<{ serviceType: string; label: string }>
  }
  const { crumbs: dynamicCrumbs } = useContext(DynamicBreadcrumbContext)

  return useMemo(() => {
    const items: BreadcrumbItem[] = []

    const deepest = matches[matches.length - 1]
    const anyParams = deepest?.params as Record<string, string> | undefined
    const hasExtensionTrail = !!(anyParams?.serviceType && projectId)

    const crumbMatches = matches.filter(
      (m) => (isRouteInfo(m.staticData) && (m.staticData as RouteInfo).crumb) || dynamicCrumbs.has(m.routeId)
    )

    for (let i = 0; i < crumbMatches.length; i++) {
      const match = crumbMatches[i]
      const dynamic = dynamicCrumbs.get(match.routeId)
      const staticCrumb = isRouteInfo(match.staticData) ? (match.staticData as RouteInfo).crumb : undefined
      const crumbText = dynamic?.text
        ? resolveCrumbText(dynamic.text, i18n)
        : staticCrumb?.text
          ? resolveCrumbText(staticCrumb.text, i18n)
          : undefined
      const crumbTo = dynamic?.to ?? staticCrumb?.to
      const crumbIcon = dynamic?.icon ?? staticCrumb?.icon
      const isLast = i === crumbMatches.length - 1 && !hasExtensionTrail
      items.push({
        label: crumbText,
        icon: crumbIcon,
        onClick: isLast ? undefined : () => navigate({ to: (crumbTo ?? match.pathname) as never }),
        active: isLast,
      })
    }

    if (hasExtensionTrail) {
      const service = additionalProjectServices?.find((s) => s.serviceType === anyParams!.serviceType)
      if (service) {
        // Active state and onClick are left for the caller (ProjectInfoBox) to set based on extension crumbs
        items.push({ label: service.label, active: true })
      }
    }

    return items
  }, [matches, dynamicCrumbs, additionalProjectServices, projectId, navigate, i18n])
}

function resolveCrumbText(text: string | MessageDescriptor, i18n: I18n): string {
  return typeof text === "string" ? text : i18n._(text)
}

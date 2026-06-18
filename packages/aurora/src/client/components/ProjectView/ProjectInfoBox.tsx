import { Breadcrumb, BreadcrumbItem, KnownIcons } from "@cloudoperators/juno-ui-components"
import { useMatches, useNavigate, useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { useLingui } from "@lingui/react/macro"
import { isRouteInfo, CrumbLabelKey } from "@/client/routes/routeInfo"

interface ProjectInfoBoxProps {
  projectInfo: {
    id: string
    name: string
    description?: string
    domain?: {
      name?: string
    }
  }
}

export function ProjectInfoBox({ projectInfo }: ProjectInfoBoxProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const matches = useMatches()
  const { projectId } = useParams({ strict: false }) as { projectId: string }

  const breadcrumbs = useMemo(() => {
    const crumbLabels: Record<CrumbLabelKey, string> = {
      Compute: t`Compute`,
      Network: t`Network`,
      Storage: t`Storage`,
      Services: t`Services`,
      Images: t`Images`,
      Flavors: t`Flavors`,
      "Security Groups": t`Security Groups`,
      "Floating IPs": t`Floating IPs`,
      "PCA (Clavis)": t`PCA (Clavis)`,
    }

    const resolveProviderLabel = (provider: string | undefined) => {
      if (provider === "swift") return t`Object Storage (Swift)`
      if (provider === "ceph") return t`Object Storage (Ceph)`
      return t`Storage`
    }

    const items: Array<{ label?: string; icon?: KnownIcons; onClick?: () => void; active?: boolean }> = []

    items.push({ icon: "home", label: t`Home`, onClick: () => navigate({ to: "/projects" }) })

    if (projectInfo.domain?.name) {
      items.push({ label: projectInfo.domain.name })
    }

    items.push({
      label: projectInfo.name,
      onClick: () => navigate({ to: "/projects/$projectId", params: { projectId } }),
    })

    const projectMatches = matches.filter(
      (m) => m.routeId !== "/_auth/projects/$projectId" && m.routeId.startsWith("/_auth/projects/$projectId")
    )
    const deepest = projectMatches[projectMatches.length - 1]
    if (!deepest) return items

    const info = isRouteInfo(deepest.staticData) ? deepest.staticData : undefined
    if (!info) return items

    const params = deepest.params as Record<string, string>

    if (info.sectionCrumb) {
      const { labelKey, to } = info.sectionCrumb
      const label = labelKey ? crumbLabels[labelKey] : undefined
      const isLeaf = !info.crumb
      items.push(
        to
          ? { label, onClick: () => navigate({ to: to as never, params: params as never }) }
          : { label, active: isLeaf }
      )
    }

    if (info.crumb) {
      const { labelKey, to, useParamAsLabel } = info.crumb
      const resolvedLabel = useParamAsLabel
        ? resolveProviderLabel(params[useParamAsLabel])
        : labelKey
          ? crumbLabels[labelKey]
          : undefined

      if (info.isDetail) {
        items.push({ label: resolvedLabel, onClick: () => navigate({ to: to as never, params: params as never }) })

        if (info.intermediateCrumb) {
          const { to: iTo, useParamAsLabel: iParam, useParentTitleAsLabel } = info.intermediateCrumb
          const parentMatch = projectMatches[projectMatches.length - 2]
          const parentTitle = parentMatch?.meta?.find((m) => m != null && "title" in m)?.title as string | undefined
          const iLabel = useParentTitleAsLabel
            ? (parentTitle ?? (iParam ? params[iParam] : undefined))
            : iParam
              ? params[iParam]
              : undefined
          items.push(
            iTo
              ? { label: iLabel, onClick: () => navigate({ to: iTo as never, params: params as never }) }
              : { label: iLabel }
          )
        }

        const title = deepest.meta?.find((m) => m != null && "title" in m)?.title as string | undefined
        if (title) items.push({ label: title, active: true })
      } else {
        items.push(
          to
            ? { label: resolvedLabel, onClick: () => navigate({ to: to as never, params: params as never }) }
            : { label: resolvedLabel, active: true }
        )
      }
    }

    return items
  }, [matches, projectInfo, projectId, navigate, t])

  return (
    <Breadcrumb className="relative z-1 mt-8 mb-4">
      {breadcrumbs.map((item, index) => (
        <BreadcrumbItem key={index} label={item.label} icon={item.icon} onClick={item.onClick} active={item.active} />
      ))}
    </Breadcrumb>
  )
}

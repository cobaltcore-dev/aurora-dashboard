import { Breadcrumb, BreadcrumbItem, ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import ClipboardText from "../ClipboardText"
import { useRouteContext, useMatches, useNavigate, useParams } from "@tanstack/react-router"
import { useState, useEffect } from "react"

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

const SECTION_LABELS: Record<string, string> = {
  compute: "Compute",
  network: "Network",
  storage: "Storage",
}

const SERVICE_LABELS: Record<string, string> = {
  images: "Images",
  flavors: "Flavors",
  instances: "Instances",
  keypairs: "Key Pairs",
  servergroups: "Server Groups",
  securitygroups: "Security Groups",
  floatingips: "Floating IPs",
  swift: "Swift",
}

// Extract section, service and detail-page flag from a TanStack route ID.
// Route IDs look like: "/_auth/accounts/$accountId/projects/$projectId/compute/$"
// The segment after $projectId is the section; the next static segment (if any) is the service.
function parseSectionService(routeId: string): { section?: string; service?: string; isDetailPage: boolean } {
  const projectIdMarker = "/projects/$projectId/"
  const idx = routeId.indexOf(projectIdMarker)
  if (idx === -1) return { isDetailPage: false }

  const rest = routeId.slice(idx + projectIdMarker.length)
  // rest examples: "compute/$", "network/$", "network/floatingips/", "network/floatingips/$floatingIpId",
  //                "network/securitygroups/$securityGroupId/", "storage/$provider/containers/",
  //                "compute/images/$imageId", "compute/flavors/$flavorId"
  const parts = rest.split("/").filter(Boolean)

  const section = parts[0]?.startsWith("$") ? undefined : parts[0]
  // Skip dynamic segments ($...) to find the service slug
  const service = parts[1] && !parts[1].startsWith("$") ? parts[1] : undefined
  // Detail if there's a dynamic segment beyond the service position
  const isDetailPage = parts.length >= 3 || (parts.length >= 2 && parts[parts.length - 1].startsWith("$"))

  return { section, service, isDetailPage }
}

export function ProjectInfoBox({ projectInfo }: ProjectInfoBoxProps) {
  const { pageTitleRef } = useRouteContext({ from: "__root__" })
  const [pageTitle, setPageTitle] = useState(pageTitleRef.current)
  const navigate = useNavigate()
  const matches = useMatches()

  const { accountId, projectId } = useParams({ strict: false }) as { accountId: string; projectId: string }

  useEffect(() => {
    const handleTitleChange = (e: CustomEvent<{ title: string }>) => {
      setPageTitle(e.detail.title)
    }
    window.addEventListener("pageTitleChange", handleTitleChange as EventListener)
    setPageTitle(pageTitleRef.current)
    return () => {
      window.removeEventListener("pageTitleChange", handleTitleChange as EventListener)
    }
  }, [pageTitleRef])

  const buildBreadcrumbs = () => {
    // Find the deepest match that is a child of the $projectId route
    const projectIdRouteId = "/_auth/accounts/$accountId/projects/$projectId"
    const childMatches = matches.filter((m) => m.routeId !== projectIdRouteId && m.routeId.startsWith(projectIdRouteId))
    const deepestMatch = childMatches[childMatches.length - 1]

    const { section, service, isDetailPage } = deepestMatch
      ? parseSectionService(deepestMatch.routeId)
      : { isDetailPage: false }

    const isServicePage = !isDetailPage && !!service
    const isSectionPage = !isDetailPage && !service && !!section

    const sectionLabel = section ? SECTION_LABELS[section] : undefined
    const serviceLabel = service ? SERVICE_LABELS[service] : undefined

    const items: Array<{ label: string; onClick?: () => void; active?: boolean }> = []

    if (projectInfo.domain?.name) {
      items.push({ label: projectInfo.domain.name })
    }

    items.push({
      label: projectInfo.name,
      onClick: () => navigate({ to: "/accounts/$accountId/projects", params: { accountId } }),
    })

    if (sectionLabel && section) {
      if (isSectionPage) {
        items.push({ label: sectionLabel, active: true })
      } else if (section === "compute") {
        items.push({
          label: sectionLabel,
          onClick: () =>
            navigate({
              to: "/accounts/$accountId/projects/$projectId/compute/$",
              params: { accountId, projectId, _splat: undefined },
            }),
        })
      } else if (section === "network") {
        items.push({
          label: sectionLabel,
          onClick: () =>
            navigate({
              to: "/accounts/$accountId/projects/$projectId/network/$",
              params: { accountId, projectId, _splat: undefined },
            }),
        })
      }
    }

    if (serviceLabel && section && service) {
      if (isServicePage) {
        items.push({ label: serviceLabel, active: true })
      } else if (isDetailPage) {
        if (section === "compute") {
          items.push({
            label: serviceLabel,
            onClick: () =>
              navigate({
                to: "/accounts/$accountId/projects/$projectId/compute/$",
                params: { accountId, projectId, _splat: service },
              }),
          })
        } else if (section === "network") {
          items.push({
            label: serviceLabel,
            onClick: () =>
              navigate({
                to: "/accounts/$accountId/projects/$projectId/network/$",
                params: { accountId, projectId, _splat: service },
              }),
          })
        }
      }
    }

    if (isDetailPage) {
      items.push({ label: pageTitle, active: true })
    }

    return items
  }

  const breadcrumbs = buildBreadcrumbs()

  return (
    <Stack direction="vertical" className="my-6" gap="2">
      <Breadcrumb>
        {breadcrumbs.map((item, index) => (
          <BreadcrumbItem key={index} label={item.label} onClick={item.onClick} active={item.active} />
        ))}
      </Breadcrumb>
      <Stack direction="horizontal" alignment="stretch">
        <ContentHeading className="text-theme-highest text-2xl font-bold">{pageTitle}</ContentHeading>

        <Stack direction="vertical" className="ml-auto">
          <div>
            <div className="text-theme-light">
              <span className="text-theme-light font-semibold">
                <Trans>Project ID</Trans>:{" "}
              </span>
              <ClipboardText text={projectInfo.id} truncateAt={15} />
            </div>
          </div>
        </Stack>
      </Stack>
    </Stack>
  )
}

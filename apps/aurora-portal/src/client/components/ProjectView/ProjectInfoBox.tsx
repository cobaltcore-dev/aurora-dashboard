import { Breadcrumb, BreadcrumbItem, ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import ClipboardText from "../ClipboardText"
import { useRouteContext, useLocation, useNavigate, useParams } from "@tanstack/react-router"
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

// Maps URL path segments to human-readable labels
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

export function ProjectInfoBox({ projectInfo }: ProjectInfoBoxProps) {
  const { pageTitleRef } = useRouteContext({ from: "__root__" })
  const [pageTitle, setPageTitle] = useState(pageTitleRef.current)
  const location = useLocation()
  const navigate = useNavigate()

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

  // Parse the URL to build breadcrumb items
  const buildBreadcrumbs = () => {
    const pathname = location.pathname
    // Match: /accounts/$accountId/projects/$projectId/{section}/{service?}/{detailId?}/...
    const base = `/accounts/${accountId}/projects/${projectId}`
    const rest = pathname.startsWith(base) ? pathname.slice(base.length) : ""
    // rest examples: "", "/compute", "/compute/images", "/compute/images/abc123", "/network/floatingips/xyz"
    const parts = rest.split("/").filter(Boolean) // ["compute"], ["compute","images"], ["compute","images","abc123"]

    const section = parts[0] // "compute", "network", "storage"
    const service = parts[1] // "images", "flavors", "securitygroups", etc.
    const isDetailPage = parts.length >= 3
    const isServicePage = parts.length === 2
    const isSectionPage = parts.length === 1

    const sectionLabel = section ? SECTION_LABELS[section] : undefined
    const serviceLabel = service ? SERVICE_LABELS[service] : undefined

    const items: Array<{ label: string; onClick?: () => void; active?: boolean }> = []

    // Domain (no link — just a label)
    if (projectInfo.domain?.name) {
      items.push({ label: projectInfo.domain.name })
    }

    // Project → navigate to projects list
    items.push({
      label: projectInfo.name,
      onClick: () => navigate({ to: "/accounts/$accountId/projects", params: { accountId } }),
    })

    // Section (Compute / Network / Storage)
    if (sectionLabel) {
      const sectionPath = `${base}/${section}`
      if (isSectionPage) {
        items.push({ label: sectionLabel, active: true })
      } else {
        items.push({
          label: sectionLabel,
          onClick: () => navigate({ to: sectionPath }),
        })
      }
    }

    // Service (Images / Flavors / etc.)
    if (serviceLabel) {
      const servicePath = `${base}/${section}/${service}`
      if (isServicePage) {
        items.push({ label: serviceLabel, active: true })
      } else if (isDetailPage) {
        items.push({
          label: serviceLabel,
          onClick: () => navigate({ to: servicePath }),
        })
      }
    }

    // Detail item (current page title) — only on detail pages
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

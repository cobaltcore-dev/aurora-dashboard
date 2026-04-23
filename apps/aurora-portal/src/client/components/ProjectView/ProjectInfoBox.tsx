import { Breadcrumb, BreadcrumbItem, ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import ClipboardText from "../ClipboardText"
import { useRouteContext, useMatches, useNavigate, useParams } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { isRouteInfo } from "@/client/routes/routeInfo"

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
  containers: "Swift",
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

    const rawData = deepestMatch?.staticData
    const routeInfo = isRouteInfo(rawData) ? rawData : undefined
    const section = routeInfo?.section
    const service = routeInfo?.service
    const isDetail = routeInfo?.isDetail ?? false

    const sectionLabel = section ? SECTION_LABELS[section] : undefined
    const serviceLabel = service ? SERVICE_LABELS[service] : undefined

    const isOverviewPage = !isDetail && service === "overview"
    const isServicePage = !isDetail && !!service && service !== "overview"
    const isSectionPage = !isDetail && !service && !!section

    const items: Array<{ label: string; onClick?: () => void; active?: boolean }> = []

    if (projectInfo.domain?.name) {
      items.push({ label: projectInfo.domain.name })
    }

    items.push({
      label: projectInfo.name,
      onClick: () => navigate({ to: "/accounts/$accountId/projects", params: { accountId } }),
    })

    if (sectionLabel && section) {
      if (isSectionPage || isOverviewPage) {
        items.push({ label: sectionLabel, active: true })
      } else if (section === "compute") {
        items.push({
          label: sectionLabel,
          onClick: () =>
            navigate({
              to: "/accounts/$accountId/projects/$projectId/compute/overview",
              params: { accountId, projectId },
            }),
        })
      } else if (section === "network") {
        items.push({
          label: sectionLabel,
          onClick: () =>
            navigate({
              to: "/projects/$projectId/network/overview",
              params: { projectId },
            }),
        })
      } else if (section === "storage") {
        items.push({ label: sectionLabel })
      }
    }

    if (serviceLabel && section && service) {
      if (isServicePage) {
        items.push({ label: serviceLabel, active: true })
      } else if (isDetail) {
        if (section === "compute" && service === "images") {
          items.push({
            label: serviceLabel,
            onClick: () =>
              navigate({
                to: "/accounts/$accountId/projects/$projectId/compute/images",
                params: { accountId, projectId },
              }),
          })
        } else if (section === "compute" && service === "flavors") {
          items.push({
            label: serviceLabel,
            onClick: () =>
              navigate({
                to: "/accounts/$accountId/projects/$projectId/compute/flavors",
                params: { accountId, projectId },
              }),
          })
        } else if (section === "network" && service === "securitygroups") {
          items.push({
            label: serviceLabel,
            onClick: () =>
              navigate({
                to: "/projects/$projectId/network/securitygroups",
                params: { projectId },
              }),
          })
        } else if (section === "network" && service === "floatingips") {
          items.push({
            label: serviceLabel,
            onClick: () =>
              navigate({
                to: "/projects/$projectId/network/floatingips",
                params: { projectId },
              }),
          })
        } else {
          items.push({
            label: serviceLabel,
            onClick: () => {
              const path = `/accounts/${accountId}/projects/${projectId}/${section}/${service}` as Parameters<
                typeof navigate
              >[0]["to"]
              navigate({ to: path })
            },
          })
        }
      }
    }

    if (isDetail) {
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

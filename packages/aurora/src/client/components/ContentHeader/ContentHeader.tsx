import type { ReactNode } from "react"
import { Divider, ContentHeading } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useRouteContext, useMatches, useParams } from "@tanstack/react-router"
import ClipboardText from "../ClipboardText"
import { Slot } from "../Slot"
import { isRouteInfo } from "@/client/routes/routeInfo"

interface ContentHeaderProps {
  title: string
  projectId: string
  description?: string | null
  actions?: ReactNode
  badges?: ReactNode
}

export function ContentHeader({ title, projectId, description, actions, badges }: ContentHeaderProps) {
  const { slots } = useRouteContext({ strict: false })
  const matches = useMatches()
  const { provider } = useParams({ strict: false }) as { provider?: string }

  const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))
  const routeService = activeMatch && isRouteInfo(activeMatch.staticData) ? activeMatch.staticData.service : undefined

  // Storage routes share service: "containers" for both Swift and Ceph.
  // Distinguish them by the $provider param.
  const currentService = routeService === "containers" && provider === "ceph" ? "ceph-containers" : routeService

  const slotActions =
    slots?.servicePageActions && currentService ? (
      <Slot component={slots.servicePageActions} useShadowDOM={false} currentService={currentService} />
    ) : null

  const serviceBanner =
    slots?.serviceBanner && currentService ? (
      <Slot component={slots.serviceBanner} useShadowDOM={false} currentService={currentService} />
    ) : null

  const projectOverviewBanner =
    slots?.projectOverviewBanner && !currentService ? (
      <Slot component={slots.projectOverviewBanner} useShadowDOM={false} />
    ) : null

  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ContentHeading>{title}</ContentHeading>
          {slotActions}
        </div>
        <div className="text-theme-light flex shrink-0 items-center gap-1 text-sm">
          <span className="font-semibold">
            <Trans>Project ID</Trans>:{" "}
          </span>
          <ClipboardText text={projectId} truncateAt={15} />
        </div>
      </div>
      {description && <p className="text-sm font-normal">{description}</p>}
      {serviceBanner}
      {projectOverviewBanner}
      <Divider className="mt-4" />
      {(badges || actions) && (
        <div className="mt-3 flex items-start justify-between">
          <div className="flex items-center gap-2">{badges} </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
    </header>
  )
}

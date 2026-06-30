import type { ReactNode } from "react"
import { Divider, ContentHeading } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useRouteContext, useMatches } from "@tanstack/react-router"
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

  const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))
  const routeService = activeMatch && isRouteInfo(activeMatch.staticData) ? activeMatch.staticData.service : undefined

  const slotActions =
    slots?.servicePageActions && routeService ? (
      <Slot component={slots.servicePageActions} useShadowDOM={false} currentService={routeService} />
    ) : null

  const serviceBanner =
    slots?.serviceBanner && routeService ? (
      <Slot component={slots.serviceBanner} useShadowDOM={false} currentService={routeService} />
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
      <Divider className="mt-4" />
      {serviceBanner}
      {(badges || actions) && (
        <div className="mt-3 flex items-start justify-between">
          <div className="flex items-center gap-2">{badges} </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
    </header>
  )
}

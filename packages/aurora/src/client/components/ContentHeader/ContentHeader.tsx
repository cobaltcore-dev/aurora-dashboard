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
}

export function ContentHeader({ title, projectId, description, actions }: ContentHeaderProps) {
  const { slots } = useRouteContext({ strict: false })
  const matches = useMatches()
  const { provider } = useParams({ strict: false }) as { provider?: string }

  const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))
  const routeService = activeMatch && isRouteInfo(activeMatch.staticData) ? activeMatch.staticData.service : undefined

  // Storage routes share service: "containers" for both Swift and Ceph.
  // Distinguish them by the $provider param.
  const currentService = routeService === "containers" && provider === "ceph" ? "ceph-containers" : routeService

  const slotActions = slots?.servicePageActions ? (
    <Slot component={slots.servicePageActions} useShadowDOM={false} currentService={currentService} />
  ) : null

  return (
    <header>
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
      {actions && <div className="mt-3 flex justify-end">{actions}</div>}
    </header>
  )
}

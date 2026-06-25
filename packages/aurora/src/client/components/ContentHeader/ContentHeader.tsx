import type { ReactNode } from "react"
import { Divider, ContentHeading } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import ClipboardText from "../ClipboardText"

interface ContentHeaderProps {
  title: string
  projectId: string
  description?: string | null
  actions?: ReactNode
}

export function ContentHeader({ title, projectId, description, actions }: ContentHeaderProps) {
  return (
    <header>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <ContentHeading>{title}</ContentHeading>
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

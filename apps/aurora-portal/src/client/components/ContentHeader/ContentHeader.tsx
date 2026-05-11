import { Divider, ContentHeading } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import ClipboardText from "../ClipboardText"

interface ContentHeaderProps {
  title: string
  projectId: string
  actions?: React.ReactNode
}

export function ContentHeader({ title, projectId, actions }: ContentHeaderProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <ContentHeading>{title}</ContentHeading>
        <div className="text-theme-light flex items-center gap-1 text-sm">
          <span className="font-semibold">
            <Trans>Project ID</Trans>:{" "}
          </span>
          <ClipboardText text={projectId} truncateAt={15} />
        </div>
      </div>
      <Divider className="mt-4" />
      {actions && <div className="mt-2 flex justify-end">{actions}</div>}
    </div>
  )
}

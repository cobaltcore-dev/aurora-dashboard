import { ContentHeading } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

interface SecurityGroupHeaderProps {
  name?: string | null
  id: string
}

export function SecurityGroupHeader({ name, id }: SecurityGroupHeaderProps) {
  return (
    <div className="mb-2">
      <ContentHeading>{`'${name || id}' Details`}</ContentHeading>
      <p className="text-theme-secondary mt-2 text-sm">
        <Trans>
          Configure the ingress and egress rules that control which traffic is allowed for this security group.
        </Trans>
      </p>
    </div>
  )
}

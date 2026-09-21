import { Status, Button } from "@cloudoperators/juno-ui-components"
import { useLingui, Trans } from "@lingui/react/macro"
import { useNavigate, useParams } from "@tanstack/react-router"
import type { StorageNotFoundReason } from "./utils/serviceAvailability"

interface StorageNotFoundProps {
  data?: { reason?: StorageNotFoundReason }
}

export function StorageNotFound({ data }: StorageNotFoundProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })

  const isBadUrl = data?.reason === "storage-type-mismatch"

  return (
    <Status
      status="error"
      code={404}
      title={isBadUrl ? t`Page Not Found` : t`Object Storage Not Found`}
      body={
        isBadUrl
          ? t`This address is not valid for this object storage service.`
          : t`This object storage service does not exist or is not available for this project.`
      }
      action={
        projectId ? (
          <Button variant="primary" onClick={() => navigate({ to: "/projects/$projectId", params: { projectId } })}>
            <Trans>Go to Project</Trans>
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate({ to: "/projects" })}>
            <Trans>Go to Projects</Trans>
          </Button>
        )
      }
    />
  )
}

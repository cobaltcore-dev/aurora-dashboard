import { Button, Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { useEffect } from "react"
import { trpcClient } from "@/client/trpcClient"
import { restartSignIn } from "@/client/utils/restartSignIn"

function SessionExpiredRedirect() {
  const { t } = useLingui()
  useEffect(() => {
    void restartSignIn(trpcClient)
  }, [])
  return <Status status="progress" title={t`Session Expired`} body={t`Redirecting to sign-in...`} />
}

export function BlockStorageState({
  loading,
  error,
  denied,
  retry,
}: {
  loading?: boolean
  error?: unknown
  denied?: boolean
  retry?: () => void
}) {
  const { t } = useLingui()
  const code = (error as { data?: { code?: string } } | undefined)?.data?.code
  if (loading) return <Status status="progress" title={t`Loading Block Storage`} />
  if (denied || code === "FORBIDDEN")
    return (
      <Status
        status="error"
        code={403}
        title={t`Insufficient Permissions`}
        body={t`You do not have permission to view this block storage resource.`}
      />
    )
  if (code === "UNAUTHORIZED") return <SessionExpiredRedirect />
  if (code === "NOT_FOUND")
    return (
      <Status
        status="error"
        code={404}
        title={t`Resource Not Accessible`}
        body={t`This resource does not exist or is not accessible in this project.`}
      />
    )
  return (
    <Status
      status="error"
      title={t`Unable to Load Block Storage`}
      body={t`Try again. If the problem persists, contact your administrator.`}
      action={retry && <Button size="xs" label={t`Try again`} onClick={retry} />}
    />
  )
}

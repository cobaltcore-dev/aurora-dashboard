import { useEffect } from "react"
import { Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcClient } from "@/client/trpcClient"
import { restartSignIn } from "@/client/utils/restartSignIn"

/** Restart authentication after a 401 without losing the current route. */
export function SessionExpired() {
  const { t } = useLingui()
  useEffect(() => {
    void restartSignIn(trpcClient)
  }, [])
  return <Status status="progress" title={t`Session Expired`} body={t`Redirecting to sign-in...`} />
}

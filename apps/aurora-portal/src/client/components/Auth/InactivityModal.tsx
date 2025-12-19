import { Modal } from "@cloudoperators/juno-ui-components"
import { useLingui, Trans } from "@lingui/react/macro"
import { useEffect, useState } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"

export function InactivityModal() {
  const { t } = useLingui()
  const [isOpen, setIsOpen] = useState(false)
  const [redirectPath, setRedirectPath] = useState<string>("")
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })

  useEffect(() => {
    const reason = sessionStorage.getItem("logout_reason")
    const savedRedirect = sessionStorage.getItem("redirect_after_login")

    if (reason === "inactive" || reason === "expired") {
      setIsOpen(true)
      // Verwende gespeicherten Pfad oder aktuellen Location
      setRedirectPath(savedRedirect || location.pathname + location.search + location.hash)
      sessionStorage.removeItem("logout_reason")
    }
  }, [location])

  const handleConfirm = () => {
    setIsOpen(false)
    navigate({
      to: "/auth/login",
      search: {
        redirect: redirectPath || undefined,
      },
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      title={t`Session Expired`}
      onConfirm={handleConfirm}
      confirmButtonLabel={t`OK`}
      cancelButtonLabel=""
      size="small"
    >
      <div className="space-y-4">
        <p>
          <Trans>You have been logged out due to inactivity.</Trans>
        </p>
        <p className="text-sm text-theme-light">
          <Trans>Please log in again to continue.</Trans>
        </p>
      </div>
    </Modal>
  )
}

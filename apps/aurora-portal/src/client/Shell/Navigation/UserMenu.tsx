import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { Button, Icon } from "@cloudoperators/juno-ui-components"
import { useAuth } from "../../Shell/AuthProvider"

function Countdown(props: { className?: string; passwordExpiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const expirationDate = new Date(props.passwordExpiresAt)

    const updateCountdown = () => {
      const now = new Date()
      const timeDiff = expirationDate.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setTimeLeft("expired!")
        return
      }

      const seconds = Math.floor(timeDiff / 1000) % 60
      const minutes = Math.floor(timeDiff / (1000 * 60)) % 60
      const hours = Math.floor(timeDiff / (1000 * 60 * 60)) % 24
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

      const formatted = [days > 0 && `${days}d`, hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`, `${seconds}s`]
        .filter(Boolean) // Remove undefined values
        .join(" ")

      setTimeLeft(formatted)
    }

    updateCountdown() // Initial update
    const intervalId = setInterval(updateCountdown, 1000)

    return () => clearInterval(intervalId) // Cleanup
  }, [props.passwordExpiresAt])

  return <div className={`text-xs pt-2 pb-2 text-theme-light ${props.className || ""}`}>{timeLeft}</div>
}

export function UserMenu() {
  const { user, isLoading, logout: authLogout } = useAuth()

  const setLocation = useLocation()[1]

  const login = () => {
    setLocation("/auth/signin")
  }

  const logout = () => {
    authLogout().then(() => setLocation("/"))
  }

  return (
    <div className="mt-5 pt-5 w-24 flex justify-center items-center">
      {user ? (
        <div className="flex flex-col items-center">
          <Icon color="jn-global-text" icon="accountCircle" />
          <div className="mt-1 mb-3">{user?.name}</div>
          <Button disabled={isLoading} variant="default" size="small" onClick={logout}>
            Sign Out
          </Button>
          <Countdown passwordExpiresAt={user.session_expires_at} />
        </div>
      ) : (
        <Button disabled={isLoading} variant="primary" size="small" onClick={login} className="mr-2 ml-2">
          Sign In
        </Button>
      )}
    </div>
  )
}

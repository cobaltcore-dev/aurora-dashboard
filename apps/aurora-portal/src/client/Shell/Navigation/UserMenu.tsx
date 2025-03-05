import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { Button, Icon } from "@cloudoperators/juno-ui-components"
import { useAuroraStore } from "../../store"

function Countdown({ className, passwordExpiresAt }: { className?: string; passwordExpiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const expirationDate = new Date(passwordExpiresAt)

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
        .filter(Boolean)
        .join(" ")

      setTimeLeft(formatted)
    }

    updateCountdown()
    const intervalId = setInterval(updateCountdown, 1000)

    return () => clearInterval(intervalId)
  }, [passwordExpiresAt])

  return <div className={`text-xs pt-2 pb-2 text-theme-light ${className || ""}`}>{timeLeft}</div>
}

export function UserMenu() {
  const user = useAuroraStore((state) => state.auth.user)
  const sessionExpiresAt = useAuroraStore((state) => state.auth.sessionExpiresAt)
  const isLoading = useAuroraStore((state) => state.auth.isLoading)
  const authLogout = useAuroraStore((state) => state.auth.logout)

  const setLocation = useLocation()[1]
  const [isOpen, setIsOpen] = useState(false)

  const login = () => {
    setLocation("/auth/signin")
  }

  const logout = () => {
    authLogout().then(() => setLocation("/"))
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
        <Icon color="jn-global-text" icon="accountCircle" className="w-6 h-6" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-4 z-50">
          {user ? (
            <div className="flex flex-col items-center">
              <div className="mt-1 mb-3 text-sm font-medium">{user?.name}</div>
              <Button disabled={isLoading} variant="default" size="small" onClick={logout}>
                Sign Out
              </Button>
              {sessionExpiresAt && <Countdown passwordExpiresAt={sessionExpiresAt} />}
            </div>
          ) : (
            <Button disabled={isLoading} variant="primary" size="small" onClick={login} className="w-full">
              Sign In
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"

export function SessionExpirationTimer(props: {
  className?: string
  sessionExpired: Date
  logout: () => Promise<void>
}) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const timeDiff = props.sessionExpired.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setTimeLeft(`expired!`)
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

    const delay = props.sessionExpired.getTime() - Date.now()

    const handleExpiration = async () => {
      try {
        await props.logout()
      } catch (error) {
        console.error("Error during session expiration logout: ", error)
      }

      // Only navigate if not already on login page
      if (pathname !== "/auth/login") {
        navigate({
          to: "/auth/login",
          search: {
            redirect: pathname || undefined,
          },
        })
      }
    }

    let logoutTimer: NodeJS.Timeout | undefined

    if (delay <= 0) {
      handleExpiration()
    } else {
      logoutTimer = setTimeout(handleExpiration, delay)
    }

    return () => {
      clearInterval(intervalId)
      if (logoutTimer) clearTimeout(logoutTimer)
    }
  }, [props.sessionExpired, props.logout, navigate, pathname])

  return <div className={`text-xs pt-2 pb-2 text-theme-light ${props.className || ""}`}>{timeLeft}</div>
}

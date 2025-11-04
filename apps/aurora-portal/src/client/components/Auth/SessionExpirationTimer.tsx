import { useEffect, useState } from "react"
import { useLingui } from "@lingui/react/macro"

export function SessionExpirationTimer(props: { className?: string; sessionExpired: Date; logout?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const timeDiff = props.sessionExpired.getTime() - now.getTime()
      const { t } = useLingui()

      if (timeDiff <= 0) {
        setTimeLeft(t`expired!`)
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

    // auto logout when session expires
    let logoutTimer: NodeJS.Timeout
    // only set the timer if the logout function is provided
    if (props.logout) {
      const delay = props.sessionExpired.getTime() - Date.now()
      if (delay < 0) props.logout()
      else logoutTimer = setTimeout(props.logout, delay)
    }

    return () => {
      clearInterval(intervalId)
      clearTimeout(logoutTimer)
    }
  }, [props.sessionExpired])

  return <div className={`text-xs pt-2 pb-2 text-theme-light ${props.className || ""}`}>{timeLeft}</div>
}

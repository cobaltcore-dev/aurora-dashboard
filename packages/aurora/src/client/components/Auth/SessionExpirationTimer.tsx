import { useEffect, useState } from "react"
import { cn } from "@/client/utils/cn"
import { Trans } from "@lingui/react/macro"

export function SessionExpirationTimer(props: { className?: string; sessionExpired: Date }) {
  const [timeLeft, setTimeLeft] = useState<string>("")

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

    return () => {
      clearInterval(intervalId)
    }
  }, [props.sessionExpired])

  return (
    <div className={cn("text-theme-light pt-2 pb-2 text-xs", props.className)}>
      <Trans>Session expires in</Trans> {timeLeft}
    </div>
  )
}

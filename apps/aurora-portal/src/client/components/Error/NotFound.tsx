import { useNavigate, useRouter } from "@tanstack/react-router"
import { ErrorPage } from "./ErrorPage"
import { useEffect, useState } from "react"

export function NotFound() {
  const navigate = useNavigate()
  const router = useRouter()
  const [hasHistory, setHasHistory] = useState(false)

  useEffect(() => {
    const hasRealHistory =
      window.history.length > 1 &&
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin

    setHasHistory(hasRealHistory)
  }, [])

  const handleBack = () => {
    if (hasHistory) {
      router.history.back()
    }
  }

  const handleHome = () => {
    navigate({ to: "/" })
  }

  return (
    <ErrorPage
      statusCode={404}
      title="Page Not Found"
      message="The page you're looking for doesn't exist."
      onBackClick={hasHistory ? handleBack : undefined}
      onHomeClick={handleHome}
      showHeader={false}
    />
  )
}

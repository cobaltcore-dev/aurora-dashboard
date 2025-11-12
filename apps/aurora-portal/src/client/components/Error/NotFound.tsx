import { useNavigate, useRouter } from "@tanstack/react-router"
import { ErrorPage } from "./ErrorPage"

export function NotFound() {
  const navigate = useNavigate()
  const router = useRouter()

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back()
    } else {
      navigate({ to: "/" })
    }
  }

  return (
    <ErrorPage
      statusCode={404}
      title="Page Not Found"
      message="The page you're looking for doesn't exist."
      onBackClick={handleBack}
      onHomeClick={() => navigate({ to: "/" })}
      showHeader={false}
    />
  )
}

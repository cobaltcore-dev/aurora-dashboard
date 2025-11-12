import { useNavigate, useRouter } from "@tanstack/react-router"
import { ErrorPage } from "./ErrorPage"

export function ErrorBoundary({ error }: { error: Error }) {
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
      statusCode={500}
      title="Something went wrong"
      message={error?.message || "An unexpected error occurred."}
      onBackClick={handleBack}
      onHomeClick={() => navigate({ to: "/" })}
      showHeader={true}
    />
  )
}

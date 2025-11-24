import { useNavigate, useRouter, ErrorComponentProps } from "@tanstack/react-router"
import { ErrorPage } from "./ErrorPage"

function getStatusCodeFromError(error: Error): number {
  if (!error || typeof error !== "object") {
    return 500
  }

  if (typeof error === "object" && error !== null) {
    if ("statusCode" in error && typeof error.statusCode === "number") {
      return error.statusCode
    }

    if ("status" in error && typeof error.status === "number") {
      return error.status
    }
  }

  return 500
}

function getTitleFromStatusCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "Bad Request"
    case 401:
      return "Unauthorized"
    case 403:
      return "Forbidden"
    case 404:
      return "Not Found"
    case 500:
      return "Internal Server Error"
    case 502:
      return "Bad Gateway"
    case 503:
      return "Service Unavailable"
    default:
      return "Something went wrong"
  }
}

export function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  let navigate: ReturnType<typeof useNavigate> | undefined
  let router: ReturnType<typeof useRouter> | undefined

  try {
    navigate = useNavigate()
    router = useRouter()
  } catch (e) {
    console.warn("Router context not available in ErrorBoundary", e)
  }

  const hasHistory =
    router &&
    window.history.length > 1 &&
    document.referrer !== "" &&
    new URL(document.referrer).origin === window.location.origin

  const statusCode = getStatusCodeFromError(error)
  const title = getTitleFromStatusCode(statusCode)

  const handleBack =
    hasHistory && router
      ? () => {
          router.history.back()
        }
      : undefined

  const handleHome = navigate
    ? () => {
        navigate({ to: "/" })
      }
    : undefined

  return (
    <ErrorPage
      statusCode={statusCode}
      title={title}
      message={error?.message || "An unexpected error occurred."}
      onBackClick={handleBack}
      onHomeClick={handleHome}
      showHeader={true}
      reset={reset}
    />
  )
}

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { z } from "zod"
import { useEffect } from "react"
import { LoginForm } from "../components/Auth/LoginForm"
import { useAuth } from "../store/AuthProvider"

function isSafeRedirect(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
}

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  component: LandingPage,
})

function LandingPage() {
  const { isLoading, isAuthenticated } = useAuth()
  const { redirect: searchRedirect } = Route.useSearch()
  const navigate = useNavigate()

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const target = isSafeRedirect(searchRedirect) ? searchRedirect : "/projects"
      navigate({ to: target, replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, searchRedirect])

  if (isLoading) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center">
        <div className="absolute inset-0 backdrop-blur-sm" />
        <Spinner variant="primary" size="large" />
      </Stack>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  // Redirecting...
  return null
}

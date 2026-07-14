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

  // Redirect-Ziel ermitteln
  const getRedirectTarget = (): string => {
    const savedRedirect = sessionStorage.getItem("redirect_after_login")

    if (isSafeRedirect(savedRedirect)) {
      return savedRedirect
    }
    if (isSafeRedirect(searchRedirect)) {
      return searchRedirect
    }
    return "/projects"
  }

  // Redirect wenn authentifiziert (in useEffect, nicht im Render!)
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const target = getRedirectTarget()
      sessionStorage.removeItem("redirect_after_login")
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

  // Nicht authentifiziert → Login Form
  if (!isAuthenticated) {
    const handleAfterLogin = async () => {
      const target = getRedirectTarget()
      sessionStorage.removeItem("redirect_after_login")
      navigate({ to: target, replace: true })
    }

    return <LoginForm afterLogin={handleAfterLogin} />
  }

  // Wird redirected...
  return null
}

import { Router, useLocation } from "wouter"

import { useEffect } from "react"

// Wouter Router with the custom parser
export function AppRouter({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation()

  useEffect(() => {
    if (location !== "/" && location.endsWith("/")) {
      navigate(location.replace(/\/+$/, ""), { replace: true })
    }
  }, [location, navigate])

  return <Router>{children}</Router>
}

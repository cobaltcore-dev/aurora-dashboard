import { useParams } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"

export function useScope() {
  const auth = useAuth()
  const { projectId } = useParams({ strict: false })

  const userDomainId = auth.user?.domain?.id
  return {
    userDomainId,
    projectId,
  }
}

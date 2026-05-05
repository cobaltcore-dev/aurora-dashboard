import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { S3CredentialPrompt } from "./-components/S3/S3CredentialPrompt"
import { isNoS3CredentialsError } from "@/client/utils/s3Errors"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/s3")({
  component: S3Layout,
})

function S3Layout() {
  const queryClient = useQueryClient()
  const [needsCredentials, setNeedsCredentials] = useState(false)

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        if (isNoS3CredentialsError(event.action.error)) {
          setNeedsCredentials(true)
        }
      }
    })
  }, [queryClient])

  if (needsCredentials) {
    return (
      <S3CredentialPrompt
        onSuccess={() => {
          setNeedsCredentials(false)
          queryClient.invalidateQueries()
        }}
      />
    )
  }

  return <Outlet />
}

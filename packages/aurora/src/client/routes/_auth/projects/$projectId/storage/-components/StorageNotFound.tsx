import { useNavigate, useRouter } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { StatusError } from "@/client/components/Error/StatusError"

interface StorageNotFoundProps {
  projectId: string
}

export function StorageNotFound({ projectId }: StorageNotFoundProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <StatusError
      statusCode={404}
      title={t`Storage Not Found`}
      message={t`The storage type you're looking for doesn't exist.`}
      onHomeClick={() => navigate({ to: "/projects/$projectId", params: { projectId } })}
      onBackClick={() => router.history.back()}
    />
  )
}

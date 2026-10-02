import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { t, msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { SecretsList } from "./-components/SecretsList"
import { uuidFromRef } from "../-components/utils"
import type { Secret } from "@/server/KeyManager/types/keyManager"
import type { RouteInfo } from "@/client/routes/routeInfo"

const secretsSearchSchema = z.object({
  search: z.string().optional(),
  sort: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/secrets/")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Secrets` },
    analytics: { name: "authorization.key-manager.secrets.list" },
  } satisfies RouteInfo,
  validateSearch: (s) => secretsSearchSchema.catch({}).parse(s),
  head: () => ({ meta: [{ title: t`Key Manager Secrets` }] }),
  component: SecretsListPage,
})

function SecretsListPage() {
  const { t } = useLingui()
  const { projectId } = Route.useParams() as { projectId: string }
  const { search = "", sort = "created:desc", page = 1 } = Route.useSearch()
  const navigate = useNavigate()

  const handleSearch = (value: string) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/secrets/",
      params: { projectId },
      search: { search: value || undefined, sort: sort || undefined, page: undefined },
    })
  }
  const handleSort = (value: string) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/secrets/",
      params: { projectId },
      search: { search: search || undefined, sort: value, page: undefined },
    })
  }
  const handlePageChange = (newPage: number) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/secrets/",
      params: { projectId },
      search: { search: search || undefined, sort: sort || undefined, page: newPage === 1 ? undefined : newPage },
    })
  }
  const handleShowDetail = (secret: Secret) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/secrets/$secretId",
      params: { projectId, secretId: uuidFromRef(secret.secret_ref) },
    })
  }

  return (
    <>
      <ContentHeader title={t`Key Manager`} projectId={projectId} />
      <SecretsList
        projectId={projectId}
        search={search}
        sort={sort}
        page={page}
        onSearchChange={handleSearch}
        onSortChange={handleSort}
        onPageChange={handlePageChange}
        onShowDetail={handleShowDetail}
      />
    </>
  )
}

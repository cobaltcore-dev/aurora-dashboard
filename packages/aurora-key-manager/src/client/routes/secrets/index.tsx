import { createRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { usePushBreadcrumbs } from "@cobaltcore-dev/aurora/client"
import { rootRoute } from "../__root"
import { SecretsList } from "./SecretsList"
import { uuidFromRef } from "../../utils"
import type { Secret } from "../../../server/types"

const secretsSearchSchema = z.object({
  search: z.string().optional(),
  sort: z.string().optional(),
  page: z.number().optional(),
})

export const secretsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/secrets",
  validateSearch: (s) => secretsSearchSchema.catch({}).parse(s),
  component: SecretsListPage,
})

function SecretsListPage() {
  const { projectId } = secretsRoute.useRouteContext()
  const { search = "", sort = "created:desc", page = 1 } = secretsRoute.useSearch()
  const navigate = useNavigate()

  usePushBreadcrumbs([
    { label: "Key Manager", onClick: () => navigate({ to: "/secrets" }) },
    { label: "Secrets", active: true },
  ])

  const handleSearch = (value: string) => {
    void navigate({ to: "/secrets", search: { search: value || undefined, sort: sort || undefined, page: undefined } })
  }
  const handleSort = (value: string) => {
    void navigate({ to: "/secrets", search: { search: search || undefined, sort: value, page: undefined } })
  }
  const handlePageChange = (newPage: number) => {
    void navigate({
      to: "/secrets",
      search: { search: search || undefined, sort: sort || undefined, page: newPage === 1 ? undefined : newPage },
    })
  }
  const handleShowDetail = (secret: Secret) => {
    void navigate({ to: "/secrets/$secretId", params: { secretId: uuidFromRef(secret.secret_ref) } })
  }

  return (
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
  )
}

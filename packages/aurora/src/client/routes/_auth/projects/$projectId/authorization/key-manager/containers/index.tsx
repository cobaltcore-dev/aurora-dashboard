import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { t, msg } from "@lingui/core/macro"
import { ContainersList } from "./-components/ContainersList"
import { uuidFromRef } from "../-components/utils"
import type { Container } from "@/server/KeyManager/types/keyManager"
import type { RouteInfo } from "@/client/routes/routeInfo"

const containersSearchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/containers/")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Containers` },
    analytics: { name: "authorization.key-manager.containers.list" },
  } satisfies RouteInfo,
  validateSearch: (s) => containersSearchSchema.catch({}).parse(s),
  head: () => ({ meta: [{ title: t`Key Manager Containers` }] }),
  component: ContainersListPage,
})

function ContainersListPage() {
  const { projectId } = Route.useParams() as { projectId: string }
  const { search = "", page = 1 } = Route.useSearch()
  const navigate = useNavigate()

  const handleSearch = (value: string) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/containers",
      params: { projectId },
      search: { search: value || undefined, page: undefined },
    })
  }
  const handlePageChange = (newPage: number) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/containers",
      params: { projectId },
      search: { search: search || undefined, page: newPage === 1 ? undefined : newPage },
    })
  }
  const handleShowDetail = (container: Container) => {
    void navigate({
      to: "/projects/$projectId/authorization/key-manager/containers/$containerId",
      params: { projectId, containerId: uuidFromRef(container.container_ref) },
    })
  }

  return (
    <ContainersList
      projectId={projectId}
      search={search}
      page={page}
      onSearchChange={handleSearch}
      onPageChange={handlePageChange}
      onShowDetail={handleShowDetail}
    />
  )
}

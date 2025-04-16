import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/accounts/$accountId/projects")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const data = await context.trpcClient?.auth.setCurrentScope.mutate({
      type: "domain",
      domainId: params.accountId || "",
    })
    return {
      crumbDomain: data?.domain,
    }
  },
})

function RouteComponent() {
  return <Outlet />
}

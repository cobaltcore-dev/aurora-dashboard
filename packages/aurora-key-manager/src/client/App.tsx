import { useMemo } from "react"
import type { FC } from "react"
import { RouterProvider } from "@tanstack/react-router"
import type { ServiceExtensionProps } from "@cobaltcore-dev/aurora/client"
import { createKmRouter } from "./router"

export const App: FC<ServiceExtensionProps> = ({ basePath, context }) => {
  const router = useMemo(() => createKmRouter(basePath, context.projectId), [basePath, context.projectId])
  return <RouterProvider router={router} context={{ projectId: context.projectId }} />
}

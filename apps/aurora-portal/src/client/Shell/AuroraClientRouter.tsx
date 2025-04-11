import { Home } from "./Home"
import { About } from "./About"
import { ComputeDashboard } from "../Compute/ComputeDashboard"
import { SignIn } from "../Auth/SignIn"
import { ProjectsOverview } from "../Project/ProejctsOverview"
import { AuroraLayout } from "./AuroraLayout"
import { RouterProvider } from "react-router-dom"
import { createBrowserRouter } from "react-router-dom"
import { RescopeError } from "./RescopeError"
import { rescopeTokenLoader, shouldRevalidateRescope } from "./RescopeTokenLoader"
import { trpcClient } from "../trpcClient"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AuroraLayout />,
    shouldRevalidate: shouldRevalidateRescope,
    loader: rescopeTokenLoader,
    errorElement: <RescopeError />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "accounts",
        children: [
          {
            path: ":domain",
            children: [
              {
                path: "projects",
                children: [
                  {
                    index: true,
                    element: <ProjectsOverview client={trpcClient.project} />,
                  },
                ],
              },
              {
                path: "projects/:project/compute/*",
                children: [
                  {
                    path: "*",
                    element: <ComputeDashboard client={trpcClient} />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <div>404: No such page!</div>,
      },
    ],
  },
])

export function AuroraClientRouter({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) {
  if (isLoading) {
    return <span>Please wait while your session is synced...</span>
  }

  if (!isAuthenticated) {
    return <SignIn trpcClient={trpcClient.auth} />
  }

  return <RouterProvider router={router} />
}

import { Routes, Route } from "react-router-dom"
import { Home } from "./Home"
import { About } from "./About"
import { ComputeDashboard } from "../Compute/ComputeDashboard"
import { SignIn } from "../Auth/SignIn"
import { ProjectsOverview } from "../Project/ProejctsOverview"
import { ProjectRescope } from "../Project/ProjectRescope"
import { trpcClient } from "../trpcClient"
import { AuroraLayout } from "./AuroraLayout"
import { DomainRescope } from "./DomainRescope"

export function AuroraRouter({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) {
  if (isLoading) {
    return <span>Please wait while your session is synced...</span>
  }

  if (!isAuthenticated) {
    return <SignIn trpcClient={trpcClient.auth} />
  }

  return (
    <Routes>
      <Route element={<AuroraLayout />}>
        <Route path={"/"} element={<Home />} />
        <Route path={"/about"} element={<About />} />

        <Route path="accounts">
          <Route path=":domain">
            <Route
              index
              path="projects"
              element={
                <DomainRescope client={trpcClient.auth}>
                  <ProjectsOverview client={trpcClient.project} />
                </DomainRescope>
              }
            ></Route>
            <Route
              path="projects/:project/compute/*"
              element={
                <ProjectRescope client={trpcClient.auth}>
                  <ComputeDashboard client={trpcClient} />
                </ProjectRescope>
              }
            />
          </Route>
        </Route>
        {/* 404 Fallback */}
        <Route path="*" element={<div>404: No such page!</div>} />
      </Route>
    </Routes>
  )
}

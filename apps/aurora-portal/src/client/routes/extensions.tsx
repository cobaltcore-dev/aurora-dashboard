import React from "react"
import { createRoute, createRootRoute, Outlet, Link } from "@tanstack/react-router"
import extensionX from "extension-x/extension"
import { Route as rootRoute } from "./__root"
import extensions from "../../extensions.json"

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/extensions",
  component: () =>
    extensions.map((ext) => (
      <div>
        <a href={`/extensions/${ext.id}`}>
          <h2>
            {ext.navigation.label} ({ext.name}@{ext.version})
          </h2>
        </a>
        <Outlet />
      </div>
    )),
})

extensions.forEach((ext) => {
  const extRoute = createRoute({
    getParentRoute: () => Route,
    path: `/${ext.id}`,
    component: () => {
      const ref = React.useRef<HTMLDivElement>(null)
      React.useEffect(() => {
        if (extensionX.registerClient) {
          extensionX
            .registerClient({
              mountRoute: `/extensions/${ext.id}`,
            })
            .then(({ mount }) => {
              mount(ref.current!)
            })
        }

        return () => {}
      }, [])
      return <div ref={ref}>HALLO</div>
    },
  })
  Route.addChildren([extRoute])
})

import React from "react"
import { createRoute, Outlet } from "@tanstack/react-router"
import { Route as rootRoute } from "./__root"
import extensions from "../../extensions"

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/extensions",
  component: ExtensionsOverviewComponent,
})

extensions.forEach((ext) => {
  const extRoute = createRoute({
    getParentRoute: () => Route,
    path: `/${ext.id}`,
    component: () => <ExtensionComponent ext={ext} />,
  })
  Route.addChildren([extRoute])
})

function ExtensionsOverviewComponent() {
  return (
    <div>
      <h1>Extensions Overview</h1>
      {extensions.length > 0 ? (
        extensions.map((ext) => (
          <div key={ext.id}>
            <a href={`/extensions/${ext.id}`}>
              <h2>
                {ext.navigation.label} ({ext.name}@{ext.version})
              </h2>
            </a>
          </div>
        ))
      ) : (
        <p>No extensions installed</p>
      )}
      <Outlet />
    </div>
  )
}

function ExtensionComponent({ ext }: { ext: (typeof extensions)[number] }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!ref.current) return

    const shadowRoot = ref.current.attachShadow({ mode: "open" })
    const container = document.createElement("div")
    shadowRoot.appendChild(container)

    import(ext.entrypoint).then((extensionModule) => {
      if (extensionModule.registerClient) {
        extensionModule
          .registerClient({
            mountRoute: `/extensions/${ext.id}`,
          })
          .then(({ mount }: { mount: (c: HTMLElement) => void }) => {
            mount(container)
          })
      }
    })

    return () => {}
  }, [])
  return <div ref={ref}>HALLO</div>
}

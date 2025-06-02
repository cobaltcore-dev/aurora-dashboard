import React, { useState } from "react"
import { createRoute } from "@tanstack/react-router"
import { Route as rootRoute } from "./__root"
import extensions from "../../extensions"
import Widget from "@material-design-icons/svg/filled/widgets.svg?react"

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/extensions",
})

export const OverviewRoute = createRoute({
  getParentRoute: () => Route,
  path: "/",
  component: ExtensionsOverviewComponent,
})

const routes = extensions.map((ext) => {
  return createRoute({
    getParentRoute: () => Route,
    path: `${ext.id}/$`,
    component: () => <ExtensionComponent ext={ext} />,
  })
})

Route.addChildren([OverviewRoute, ...routes])

export default function ExtensionsOverviewComponent() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredExtensions = extensions.filter(
    (ext) =>
      ext.navigation.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <h3 className="text-xl font-semibold mb-2 text-aurora-white">No Extensions Installed</h3>
    </div>
  )

  const ExtensionListItem = ({ ext }: { ext: (typeof extensions)[0] }) => {
    // const IconComponent = ext.icon
    return (
      <div className="bg-aurora-gray-900 bg-opacity-60 p-4 rounded-lg border border-aurora-gray-800 hover:border-aurora-blue-600 transition duration-300 shadow-lg group">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-12 h-12 bg-aurora-blue-950 rounded-lg flex items-center justify-center border border-aurora-blue-700">
              <Widget fill="white" />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="font-semibold text-aurora-white group-hover:text-aurora-blue-400 transition-colors">
                  <a href={`/extensions/${ext.id}`} className="block">
                    {ext.navigation.label}
                  </a>
                </h3>
                {/* Type Badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    ext.type === "aurora-extension"
                      ? "bg-aurora-blue-950/50 text-aurora-blue-300 border-aurora-blue-700/50"
                      : "bg-aurora-gray-800/50 text-aurora-gray-300 border-aurora-gray-700/50"
                  }`}
                >
                  {ext.type}
                </span>
              </div>
              <div className="text-sm text-aurora-gray-400 truncate">
                {ext.name}@{ext.version}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-aurora-gray-500">Mountpoint:</span>
              <div className="flex items-center space-x-2 bg-aurora-gray-800/30 rounded-lg px-3 py-1.5 border border-aurora-gray-700/50">
                <code className="text-xs font-mono text-aurora-blue-300">/extensions/{ext.id}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(`/extensions/${ext.id}`)}
                  className="p-1 text-aurora-gray-400 hover:text-aurora-blue-400 transition-colors rounded"
                  title="Copy mountpoint"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <a
                  href={`/extensions/${ext.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-aurora-gray-400 hover:text-aurora-blue-400 transition-colors rounded"
                  title="Open extension"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-aurora-gray-950 to-aurora-gray-900 text-aurora-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <main>
          {/* Extensions Section */}
          <section id="extensions" className="py-12 border-t border-aurora-gray-800">
            {extensions.length > 0 ? (
              <>
                {/* Search and Filters */}
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Extensions</h2>
                    <p className="text-aurora-gray-400">Installed and active Extensions</p>
                  </div>
                </div>

                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-8 w-full">
                  <div className="relative flex-1">
                    {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-aurora-gray-400" /> */}
                    <input
                      type="text"
                      placeholder="Search extensions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-aurora-gray-900 border border-aurora-gray-800 rounded-lg text-aurora-white placeholder-aurora-gray-400 focus:outline-none focus:border-aurora-blue-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Extensions Grid/List */}
                {filteredExtensions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredExtensions.map((ext) => (
                      <ExtensionListItem key={ext.id} ext={ext} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    {/* <Package className="w-12 h-12 text-aurora-gray-400 mx-auto mb-4" /> */}
                    <h3 className="text-lg font-semibold mb-2 text-aurora-white">No extensions found</h3>
                    <p className="text-aurora-gray-400">Try adjusting your search terms or filters.</p>
                  </div>
                )}
              </>
            ) : (
              <EmptyState />
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

function ExtensionComponent({ ext }: { ext: (typeof extensions)[number] }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!ref.current || ref.current.shadowRoot || !ext.uiLoader) return

    const shadowRoot = ref.current.attachShadow({ mode: "open" })
    const container = document.createElement("div")
    shadowRoot.appendChild(container)

    ext.uiLoader.then((extensionModule) => {
      if (extensionModule.registerClient) {
        extensionModule
          .registerClient({
            mountRoute: `/extensions/${ext.id}`,
          })
          .then(({ mount }: { mount: (c: HTMLElement) => void }) => {
            mount(container as HTMLElement)
          })
      }
    })

    return () => {}
  }, [])
  return <div ref={ref}>Hello</div>
}

import { createFileRoute, Link, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/gardener/")({
  component: Gardener,
})

function Gardener() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Kubernetes Clusters</h1>
          <p className="text-gray-400">Manage your Kubernetes clusters and their configurations</p>
          <div className="flex items-center mt-4">
            <Link to="/gardener/clusters">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200">
                View Clusters
              </button>
            </Link>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

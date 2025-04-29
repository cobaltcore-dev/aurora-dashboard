import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/gardener")({
  component: Gardener,
})

function Gardener() {
  return (
    <div className="min-h-screen flex items-start justify-start bg-gray-100 px-6 mt-10">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl font-bold text-gray-900 mb-8">Gardener</h1>

        <p className="text-lg text-gray-700 leading-relaxed">
          Welcome to <strong className="text-gray-900">Gardener</strong>
        </p>
      </div>
    </div>
  )
}

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "../components/headless-ui/Button"
import { Trans } from "@lingui/react/macro"

export const Route = createFileRoute("/")({
  component: Home,
})

export function Home() {
  const navigate = useNavigate()

  const handleEnterCloud = () => {
    navigate({
      to: "/accounts",
    })
  }

  return (
    <div className="min-h-screen flex items-start justify-start bg-gray-100 px-6 mt-10">
      <div className="max-w-4xl w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-5xl font-bold text-gray-900" data-testid="welcome-title">
            <Trans>Welcome to Aurora Dashboard</Trans>
          </h1>
          <Button
            onClick={handleEnterCloud}
            className="h-10 px-4 bg-sap-green text-sm hover:bg-sap-green-4 text-white font-medium rounded-md shadow-sm transition hover:scale-105 flex items-center"
          >
            <span>
              <Trans>Enter the Cloud</Trans>
            </span>

            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </div>

        <p className="text-lg text-gray-700 leading-relaxed">
          <Trans>
            The <strong className="text-gray-900">Aurora Dashboard</strong> is on its way! Get ready for a powerful,
            all-in-one cloud management interface designed to make managing your cloud assets simple and efficient. With
            tools for provisioning, configuring, and scaling resources like servers, networks, and volumes, Aurora will
            soon bring you:
          </Trans>
        </p>

        <ul className="mt-8 space-y-6 text-lg text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 font-semibold text-2xl">•</span>
            <p className="ml-4">
              <Trans>
                <strong className="text-gray-900">Centralized Cloud Control</strong>: Manage all your assets from one
                intuitive interface.
              </Trans>
            </p>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 font-semibold text-2xl">•</span>
            <p className="ml-4">
              <Trans>
                <strong className="text-gray-900">Efficient Resource Management</strong>: Provision, configure, and
                scale resources across cloud environments with ease.
              </Trans>
            </p>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 font-semibold text-2xl">•</span>
            <p className="ml-4">
              <Trans>
                <strong className="text-gray-900">Enhanced Scalability</strong>: Seamlessly handle everything from small
                setups to complex, multi-cloud environments.
              </Trans>
            </p>
          </li>
        </ul>

        <div className="mt-10 text-lg text-gray-700 flex flex-col items-center md:items-start">
          <p>
            <Trans>
              Stay tuned — Aurora Dashboard is launching soon to streamline your cloud management experience!
            </Trans>
          </p>

          <div className="mt-8 mb-4 w-full flex justify-center md:justify-start">
            <button
              onClick={handleEnterCloud}
              className="py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg shadow-xl transform transition-all hover:translate-y-[-2px] flex items-center"
            >
              <span>
                <Trans>Enter the Cloud</Trans>
              </span>
              <svg
                className="ml-2 w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useAuroraContext } from "./AuroraProvider"

export function Home() {
  const { setCurrentProject } = useAuroraContext()
  setCurrentProject(null)
  return (
    <div className="min-h-screen flex items-start justify-start bg-gray-100 px-6 mt-10">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl font-bold text-gray-900 mb-8">Welcome to Aurora Dashboard</h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          The <strong className="text-gray-900">Aurora Dashboard</strong> is on its way! Get ready for a powerful,
          all-in-one cloud management interface designed to make managing your cloud assets simple and efficient. With
          tools for provisioning, configuring, and scaling resources like servers, networks, and volumes, Aurora will
          soon bring you:
        </p>

        <ul className="mt-8 space-y-6 text-lg text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 font-semibold text-2xl">•</span>
            <p className="ml-4">
              <strong className="text-gray-900">Centralized Cloud Control</strong>: Manage all your assets from one
              intuitive interface.
            </p>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 font-semibold text-2xl">•</span>
            <p className="ml-4">
              <strong className="text-gray-900">Efficient Resource Management</strong>: Provision, configure, and scale
              resources across cloud environments with ease.
            </p>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 font-semibold text-2xl">•</span>
            <p className="ml-4">
              <strong className="text-gray-900">Enhanced Scalability</strong>: Seamlessly handle everything from small
              setups to complex, multi-cloud environments.
            </p>
          </li>
        </ul>

        <p className="mt-10 text-lg text-gray-700">
          Stay tuned—Aurora Dashboard is launching soon to streamline your cloud management experience!
        </p>
      </div>
    </div>
  )
}

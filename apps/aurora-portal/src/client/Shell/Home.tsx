import { FormattedText } from "@cloudoperators/juno-ui-components"
import { useAuroraContext } from "./AuroraProvider"

export function Home() {
  const { setCurrentProject } = useAuroraContext()
  setCurrentProject(null)
  return (
    <FormattedText className="p-5">
      <h1>Welcome to Aurora Dashboard </h1>
      <p>
        The <strong>Aurora Dashboard</strong> is on its way! Get ready for a powerful, all-in-one cloud management
        interface designed to make managing your cloud assets simple and efficient. With tools for provisioning,
        configuring, and scaling resources like servers, networks, and volumes, Aurora will soon bring you:
      </p>

      <ul>
        <li>
          <strong>Centralized Cloud Control</strong>: Manage all your assets from one intuitive interface.
        </li>
        <li>
          <strong>Efficient Resource Management</strong>: Provision, configure, and scale resources across cloud
          environments with ease.
        </li>
        <li>
          <strong>Enhanced Scalability</strong>: Seamlessly handle everything from small setups to complex, multi-cloud
          environments.
        </li>
      </ul>

      <p>Stay tuned—Aurora Dashboard is launching soon to streamline your cloud management experience!</p>
    </FormattedText>
  )
}

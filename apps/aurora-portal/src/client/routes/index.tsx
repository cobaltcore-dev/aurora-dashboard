import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Button, Box, Stack, Icon } from "@cloudoperators/juno-ui-components"

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
    <div className="flex flex-col items-center justify-center px-6 py-12 h-[80vh]">
      <div className="max-w-4xl w-full p-8">
        <h1 className="text-5xl font-extrabold text-center mb-8 text-theme-default">
          <Trans>
            Manage OpenStack with <span className="text-theme-accent">Aurora</span>{" "}
          </Trans>
        </h1>
        <p className="text-lg text-theme-default leading-relaxed text-center mb-8">
          <Trans>
            Aurora empowers you with robust tools to streamline your cloud management effortlessly. Experience a
            seamless way to provision, configure, and scale your resources across OpenStack environments.
          </Trans>
        </p>

        <Stack className="w-full flex flex-col md:flex-row justify-center mb-8" gap="4">
          <Box className="md:w-1/2 p-6 rounded-lg shadow-md bg-theme-background-lvl-1">
            <h2 className="text-2xl font-semibold text-theme-default">
              <Trans>GitHub</Trans>
            </h2>
            <p className="text-theme-default">
              <Trans>Check out our source code on GitHub!</Trans>
            </p>
            <a href="https://github.com/cobaltcore-dev/aurora-dashboard">
              <Trans>View Repository</Trans>
            </a>
          </Box>
          <Box className="md:w-1/2 p-6 rounded-lg shadow-md bg-theme-background-lvl-1">
            <h2 className="text-2xl font-semibold text-theme-default">
              <Trans>Documentation</Trans>
            </h2>
            <p className="text-theme-default">
              <Trans>Find detailed guides and references in our docs.</Trans>
            </p>
            <a href="#">
              <Trans>View Docs</Trans>
            </a>
          </Box>
        </Stack>

        <Button onClick={handleEnterCloud} variant="primary" className="w-full py-4 text-lg font-bold">
          <span>
            <Trans>Enter the Cloud</Trans>
          </span>
          <Icon icon="chevronRight" onClick={function Ofe() {}} />
        </Button>
      </div>
    </div>
  )
}

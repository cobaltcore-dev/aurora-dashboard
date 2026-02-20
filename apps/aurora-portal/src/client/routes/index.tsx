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
    <div className="flex flex-col items-center justify-center">
      <div className="max-w-4xl p-8">
        <h1 className="text-theme-default mb-8 text-center text-5xl font-extrabold">
          <Trans>Manage OpenStack with </Trans>
          <span className="text-theme-accent">Aurora</span>
        </h1>
        <p className="text-theme-default mb-8 text-center text-lg leading-relaxed">
          <Trans>
            Aurora empowers you with robust tools to streamline your cloud management effortlessly. Experience a
            seamless way to provision, configure, and scale your resources across OpenStack environments.
          </Trans>
        </p>

        <Stack className="mb-8 flex w-full flex-col justify-center md:flex-row" gap="4">
          <Box className="bg-theme-background-lvl-1 rounded-lg p-6 shadow-md md:w-1/2">
            <h2 className="text-theme-default text-2xl font-semibold">
              <Trans>GitHub</Trans>
            </h2>
            <p className="text-theme-default">
              <Trans>Check out our source code on GitHub!</Trans>
            </p>
            <a href="https://github.com/cobaltcore-dev/aurora-dashboard">
              <Trans>View Repository</Trans>
            </a>
          </Box>
          <Box className="bg-theme-background-lvl-1 rounded-lg p-6 shadow-md md:w-1/2">
            <h2 className="text-theme-default text-2xl font-semibold">
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
          <Icon icon="chevronRight" />
        </Button>
      </div>
    </div>
  )
}

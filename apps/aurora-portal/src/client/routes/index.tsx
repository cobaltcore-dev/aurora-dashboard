import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Button, Box, Stack, Icon, Container } from "@cloudoperators/juno-ui-components"
import { MdComputer, MdStorage, MdRouter, MdImage, MdTune, MdVpnKey, MdCode, MdMenuBook } from "react-icons/md"

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
    <div className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-4 py-16">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-theme-accent/5 absolute -top-40 -left-40 h-80 w-80 rounded-full blur-3xl" />
        <div className="bg-theme-accent/5 absolute -right-40 -bottom-40 h-80 w-80 rounded-full blur-3xl" />
      </div>

      <Container className="relative z-10 max-w-6xl">
        <Stack direction="vertical" gap="16" alignment="center">
          {/* Hero Section */}
          <Stack direction="vertical" gap="8" alignment="center" className="text-center">
            <div className="space-y-6">
              <h1 className="text-5xl leading-tight font-bold tracking-tight sm:text-6xl lg:text-7xl">
                <Trans>Manage OpenStack</Trans>
                <br />
                <Trans>with</Trans>{" "}
                <span className="relative inline-block">
                  <span className="from-theme-accent via-theme-accent-emphasis to-theme-accent bg-gradient-to-r bg-clip-text text-transparent">
                    Aurora
                  </span>
                  <div className="bg-theme-accent/20 absolute -bottom-2 left-0 h-3 w-full -skew-x-12 transform" />
                </span>
              </h1>

              <p className="text-theme-light mx-auto max-w-2xl text-xl leading-relaxed sm:text-2xl">
                <Trans>
                  Streamline your cloud infrastructure with powerful tools to provision, configure, and scale resources
                  across OpenStack environments.
                </Trans>
              </p>
            </div>

            <Stack direction="horizontal" gap="4" className="flex-col sm:flex-row">
              <Button
                onClick={handleEnterCloud}
                variant="primary"
                size="default"
                className="group px-8 py-4 text-lg font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <span>
                  <Trans>Enter the Cloud</Trans>
                </span>
                <Icon icon="chevronRight" className="transition-transform group-hover:translate-x-1" />
              </Button>
            </Stack>
          </Stack>

          {/* Feature Cards */}
          <Stack direction="horizontal" gap="6" className="w-full flex-col lg:flex-row">
            <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent relative flex-1 overflow-hidden rounded-2xl border p-8 transition-all hover:shadow-2xl">
              <div className="bg-theme-accent/5 absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <Stack direction="vertical" gap="4" className="relative">
                <div className="bg-theme-accent/10 flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                  <MdCode size={28} className="text-theme-accent" />
                </div>
                <h2 className="text-2xl font-bold">
                  <Trans>Open Source</Trans>
                </h2>
                <p className="text-theme-light text-base leading-relaxed">
                  <Trans>
                    Built in the open. Explore our codebase, contribute improvements, or customize Aurora for your
                    needs.
                  </Trans>
                </p>
                <a
                  href="https://github.com/cobaltcore-dev/aurora-dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-theme-accent hover:text-theme-accent-emphasis inline-flex items-center gap-2 font-semibold transition-colors"
                >
                  <Trans>Explore Repository</Trans>
                  <Icon icon="exitToApp" size="18" className="transition-transform group-hover:translate-x-1" />
                </a>
              </Stack>
            </Box>

            <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent relative flex-1 overflow-hidden rounded-2xl border p-8 transition-all hover:shadow-2xl">
              <div className="bg-theme-accent/5 absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <Stack direction="vertical" gap="4" className="relative">
                <div className="bg-theme-accent/10 flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                  <MdMenuBook size={28} className="text-theme-accent" />
                </div>
                <h2 className="text-2xl font-bold">
                  <Trans>Documentation</Trans>
                </h2>
                <p className="text-theme-light text-base leading-relaxed">
                  <Trans>
                    Get started quickly with comprehensive guides, tutorials, and API references for every feature.
                  </Trans>
                </p>
                <a
                  href="#"
                  className="text-theme-accent hover:text-theme-accent-emphasis inline-flex items-center gap-2 font-semibold transition-colors"
                >
                  <Trans>Read the Docs</Trans>
                  <Icon icon="exitToApp" size="18" className="transition-transform group-hover:translate-x-1" />
                </a>
              </Stack>
            </Box>
          </Stack>

          {/* Key Features Grid */}
          <Stack direction="vertical" gap="8" className="w-full">
            <div className="text-center">
              <h3 className="mb-2 text-3xl font-bold">
                <Trans>What You Can Manage</Trans>
              </h3>
              <p className="text-theme-light text-lg">
                <Trans>Complete control over your OpenStack infrastructure</Trans>
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdComputer size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Compute Instances</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Launch and manage virtual machines with custom flavors and configurations</Trans>
                  </p>
                </Stack>
              </Box>

              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdStorage size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Block Storage</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Create, attach, and manage persistent block storage volumes</Trans>
                  </p>
                </Stack>
              </Box>

              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdRouter size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Networking</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Configure networks, subnets, routers, and security groups</Trans>
                  </p>
                </Stack>
              </Box>

              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdImage size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Images</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Manage OS images and snapshots for rapid instance deployment</Trans>
                  </p>
                </Stack>
              </Box>

              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdTune size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Flavors</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Define and customize instance sizes with CPU, RAM, and disk specs</Trans>
                  </p>
                </Stack>
              </Box>

              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdVpnKey size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Key Pairs</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Manage SSH keys for secure instance access and authentication</Trans>
                  </p>
                </Stack>
              </Box>
            </div>
          </Stack>
        </Stack>
      </Container>

      {/* Footer */}
      <footer className="border-theme-background-lvl-3 relative z-10 w-full border-t">
        <Container className="max-w-6xl py-12">
          <Stack direction="vertical" gap="8">
            <Stack direction="horizontal" gap="12" className="flex-col justify-between md:flex-row">
              {/* About Section */}
              <Stack direction="vertical" gap="3" className="flex-1">
                <h3 className="text-lg font-semibold">
                  <Trans>About Aurora</Trans>
                </h3>
                <p className="text-theme-light text-sm leading-relaxed">
                  <Trans>
                    An open-source OpenStack management platform built for modern cloud infrastructure teams.
                  </Trans>
                </p>
              </Stack>

              {/* Quick Links */}
              <Stack direction="vertical" gap="3" className="flex-1">
                <h3 className="text-lg font-semibold">
                  <Trans>Quick Links</Trans>
                </h3>
                <Stack direction="vertical" gap="2">
                  <a href="https://github.com/cobaltcore-dev/aurora-dashboard" target="_blank" rel="noopener noreferrer" className="text-theme-light hover:text-theme-accent text-sm transition-colors">
                    <Trans>GitHub Repository</Trans>
                  </a>
                  <a href="#" className="text-theme-light hover:text-theme-accent text-sm transition-colors">
                    <Trans>Documentation</Trans>
                  </a>
                  <a href="#" className="text-theme-light hover:text-theme-accent text-sm transition-colors">
                    <Trans>API Reference</Trans>
                  </a>
                </Stack>
              </Stack>

              {/* Contact */}
              <Stack direction="vertical" gap="3" className="flex-1">
                <h3 className="text-lg font-semibold">
                  <Trans>Contact</Trans>
                </h3>
                <Stack direction="vertical" gap="2">
                  <a href="#" className="text-theme-light hover:text-theme-accent text-sm transition-colors">
                    <Trans>Support</Trans>
                  </a>
                  <a href="https://github.com/cobaltcore-dev/aurora-dashboard/issues" target="_blank" rel="noopener noreferrer" className="text-theme-light hover:text-theme-accent text-sm transition-colors">
                    <Trans>Report an Issue</Trans>
                  </a>
                  <a href="#" className="text-theme-light hover:text-theme-accent text-sm transition-colors">
                    <Trans>Community</Trans>
                  </a>
                </Stack>
              </Stack>
            </Stack>

            {/* Copyright */}
            <div className="border-theme-background-lvl-3 border-t pt-6">
              <p className="text-theme-light text-center text-sm">
                <Trans>© 2024 Aurora Dashboard. Open source under MIT License.</Trans>
              </p>
            </div>
          </Stack>
        </Container>
      </footer>
    </div>
  )
}

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Button, Box, Stack, Icon, Container } from "@cloudoperators/juno-ui-components"
import { MdStorage, MdRouter, MdImage, MdTune, MdCode, MdMenuBook, MdPublic } from "react-icons/md"

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
                <Trans>Manage Your Cloud</Trans>
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
                <span
                  className="text-theme-light inline-flex items-center gap-2 font-semibold"
                  title="Documentation coming soon"
                  aria-disabled="true"
                >
                  <Trans>Read the Docs</Trans>
                  <span className="text-xs opacity-60">
                    <Trans>(Coming Soon)</Trans>
                  </span>
                </span>
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
                <Trans>Powerful tools for your OpenStack infrastructure</Trans>
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    <MdRouter size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Security Groups</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Configure firewall rules and network security policies</Trans>
                  </p>
                </Stack>
              </Box>

              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdPublic size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Floating IPs</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Allocate and manage public IP addresses for external connectivity</Trans>
                  </p>
                </Stack>
              </Box>

              <Box className="bg-theme-background-lvl-1 group border-theme-background-lvl-3 hover:border-theme-accent/50 rounded-xl border p-6 transition-all hover:shadow-lg">
                <Stack direction="vertical" gap="3" alignment="center" className="text-center">
                  <div className="bg-theme-accent/10 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                    <MdStorage size={32} className="text-theme-accent" />
                  </div>
                  <h4 className="text-lg font-semibold">
                    <Trans>Object Storage</Trans>
                  </h4>
                  <p className="text-theme-light text-sm leading-relaxed">
                    <Trans>Store and manage files with Swift object storage containers</Trans>
                  </p>
                </Stack>
              </Box>
            </div>

            <p className="text-theme-light text-center text-sm italic">
              <Trans>More features coming soon as we continue to expand Aurora's capabilities</Trans>
            </p>
          </Stack>
        </Stack>
      </Container>
    </div>
  )
}

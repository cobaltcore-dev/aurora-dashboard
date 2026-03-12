import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Button, Icon } from "@cloudoperators/juno-ui-components"

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Background */}
      <div className="from-theme-background-lvl-0 via-theme-background-lvl-1 to-theme-background-lvl-2 absolute inset-0 bg-gradient-to-br" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-theme-accent/5 absolute top-20 -left-4 h-72 w-72 rounded-full blur-3xl" />
        <div className="bg-theme-accent/5 absolute top-40 -right-4 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-theme-accent/10 absolute bottom-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-6xl">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="text-theme-highest mb-6 text-6xl font-extrabold tracking-tight md:text-7xl">
              <Trans>Manage Your Cloud with </Trans>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Aurora</span>
            </h1>
            <p className="text-theme-default mx-auto mb-10 max-w-2xl text-xl leading-relaxed">
              <Trans>
                A modern dashboard to manage your cloud infrastructure effortlessly. Experience a seamless way to
                provision, configure, and scale your resources across cloud environments.
              </Trans>
            </p>

            {/* CTA Button */}
            <Button
              onClick={handleEnterCloud}
              variant="primary"
              className="hover:shadow-accent/50 group transform px-8 py-4 text-lg font-bold shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <span>
                <Trans>Enter the Cloud</Trans>
              </span>
              <Icon icon="chevronRight" className="transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            {/* Compute Card */}
            <div className="group border-theme-background-lvl-3 bg-theme-background-lvl-1/80 hover:border-theme-accent/30 relative overflow-hidden rounded-2xl border p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                <Icon icon="dns" size="32" className="text-blue-400" />
              </div>
              <h3 className="text-theme-highest mb-3 text-2xl font-bold">
                <Trans>Compute</Trans>
              </h3>
              <p className="text-theme-default/80 leading-relaxed">
                <Trans>Manage virtual machines, flavors, and compute resources with ease</Trans>
              </p>
              <div className="from-theme-accent/0 to-theme-accent/0 group-hover:from-theme-accent/5 absolute inset-0 bg-gradient-to-br transition-all duration-300" />
            </div>

            {/* Network Card */}
            <div className="group border-theme-background-lvl-3 bg-theme-background-lvl-1/80 hover:border-theme-accent/30 relative overflow-hidden rounded-2xl border p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                <Icon icon="hub" size="32" className="text-purple-400" />
              </div>
              <h3 className="text-theme-highest mb-3 text-2xl font-bold">
                <Trans>Network</Trans>
              </h3>
              <p className="text-theme-default/80 leading-relaxed">
                <Trans>Configure networks, security groups, and floating IPs effortlessly</Trans>
              </p>
              <div className="from-theme-accent/0 to-theme-accent/0 group-hover:from-theme-accent/5 absolute inset-0 bg-gradient-to-br transition-all duration-300" />
            </div>

            {/* Storage Card */}
            <div className="group border-theme-background-lvl-3 bg-theme-background-lvl-1/80 hover:border-theme-accent/30 relative overflow-hidden rounded-2xl border p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20">
                <Icon icon="storage" size="32" className="text-green-400" />
              </div>
              <h3 className="text-theme-highest mb-3 text-2xl font-bold">
                <Trans>Storage</Trans>
              </h3>
              <p className="text-theme-default/80 leading-relaxed">
                <Trans>Provision volumes and manage object storage across your infrastructure</Trans>
              </p>
              <div className="from-theme-accent/0 to-theme-accent/0 group-hover:from-theme-accent/5 absolute inset-0 bg-gradient-to-br transition-all duration-300" />
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* GitHub Card */}
            <div className="group border-theme-background-lvl-3 bg-theme-background-lvl-1/80 hover:border-theme-accent/30 rounded-2xl border p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <Icon icon="openInNew" size="24" className="text-theme-accent" />
                <h2 className="text-theme-highest text-2xl font-bold">
                  <Trans>GitHub</Trans>
                </h2>
              </div>
              <p className="text-theme-default/80 mb-4 leading-relaxed">
                <Trans>Check out our source code on GitHub!</Trans>
              </p>
              <a
                href="https://github.com/cobaltcore-dev/aurora-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-accent hover:text-theme-accent-emphasis inline-flex items-center gap-2 font-semibold transition-colors"
              >
                <Trans>View Repository</Trans>
                <Icon icon="arrowForward" size="18" />
              </a>
            </div>

            {/* Documentation Card */}
            <div className="group border-theme-background-lvl-3 bg-theme-background-lvl-1/80 hover:border-theme-accent/30 rounded-2xl border p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <Icon icon="description" size="24" className="text-theme-accent" />
                <h2 className="text-theme-highest text-2xl font-bold">
                  <Trans>Documentation</Trans>
                </h2>
              </div>
              <p className="text-theme-default/80 mb-4 leading-relaxed">
                <Trans>Find detailed guides and references in our docs.</Trans>
              </p>
              <a
                href="#"
                className="text-theme-accent hover:text-theme-accent-emphasis inline-flex items-center gap-2 font-semibold transition-colors"
              >
                <Trans>View Docs</Trans>
                <Icon icon="arrowForward" size="18" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Container, ContentHeading } from "@cloudoperators/juno-ui-components/index"

export const Route = createFileRoute("/about")({
  component: About,
})

function About() {
  return (
    <Container className="flex flex-col items-center justify-center py-12 px-6 sm:px-12 md:px-20">
      <div className="w-full lg:w-2/3 mx-auto">
        <ContentHeading className="text-center mb-6">
          <Trans>About Aurora Dashboard</Trans>
        </ContentHeading>
        <p className="text-center mb-8">
          <Trans>
            Welcome to <strong>Aurora Dashboard</strong>, your next-generation cloud management solution. We are
            dedicated to simplifying how you interact with and manage your cloud infrastructure. Designed with
            efficiency, scalability, and usability at its core, Aurora empowers you to streamline operations and unlock
            the full potential of your cloud resources.
          </Trans>
        </p>
        <ContentHeading className="text-center mb-4">
          <Trans>Our Mission</Trans>
        </ContentHeading>
        <p className="text-center mb-8">
          <Trans>
            At Aurora, our mission is to provide a centralized platform that unifies cloud management. We aim to
            simplify the complexities of provisioning, configuring, and scaling resources across diverse cloud
            environments while enabling seamless growth for your business.
          </Trans>
        </p>
        <ContentHeading className="text-center mb-4">
          <Trans>Key Features</Trans>
        </ContentHeading>
        <ul className="list-disc pl-6 mb-8 space-y-4">
          <li>
            <p>
              <Trans>
                <strong>Unified Cloud Management:</strong> Consolidates all your cloud assets into one intuitive
                interface.
              </Trans>
            </p>
          </li>
          <li>
            <p>
              <Trans>
                <strong>Effortless Resource Provisioning:</strong> Quickly provision, configure, and deploy resources
                like servers, networks, and volumes with just a few clicks.
              </Trans>
            </p>
          </li>
          <li>
            <p>
              <Trans>
                <strong>Optimized Scalability:</strong> Built for businesses of all sizes, Aurora grows with you,
                supporting simple environments and intricate multi-cloud setups alike.
              </Trans>
            </p>
          </li>
          <li>
            <p>
              <Trans>
                <strong>Enhanced Productivity:</strong> By reducing operational complexity, Aurora helps your team focus
                on what truly matters—innovating and driving business success.
              </Trans>
            </p>
          </li>
        </ul>
        <ContentHeading className="text-center mb-4">
          <Trans>Why Choose Aurora?</Trans>
        </ContentHeading>
        <p className="text-center mb-8">
          <Trans>
            Aurora Dashboard is more than just a tool—it's your partner in navigating the cloud. Whether you're a small
            startup or a global enterprise, Aurora provides the flexibility, power, and simplicity you need to achieve
            your goals.
          </Trans>
        </p>
        <ul className="list-disc pl-6 mb-8 space-y-4">
          <li>
            <p>
              <Trans>
                <strong>Secure & Reliable:</strong> Your data and operations are safeguarded with enterprise-grade
                security and robust reliability.
              </Trans>
            </p>
          </li>
          <li>
            <p>
              <Trans>
                <strong>Future-Ready:</strong> Aurora is designed to evolve with the latest trends in cloud technology,
                ensuring your solution is always cutting-edge.
              </Trans>
            </p>
          </li>
        </ul>
        <ContentHeading className="text-center mb-4">
          <Trans>Get Involved</Trans>
        </ContentHeading>
        <p className="text-center mb-6">
          <Trans>
            We are building Aurora Dashboard to serve you better. Your feedback is invaluable in shaping a tool that
            meets the unique needs of businesses like yours. Stay connected and join us as we redefine cloud management.
          </Trans>
        </p>
        <p className="text-center">
          <Trans>Together, we can unlock the true potential of your cloud infrastructure.</Trans>
        </p>
      </div>
    </Container>
  )
}

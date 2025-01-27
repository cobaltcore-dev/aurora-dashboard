// @ts-expect-error missing types
import { FormattedText } from "@cloudoperators/juno-ui-components"

export function About() {
  return (
    <FormattedText className="p-5">
      <h1>About Aurora Dashboard</h1>
      <p>
        Welcome to <strong>Aurora Dashboard</strong>, your next-generation cloud management solution. We are dedicated
        to simplifying how you interact with and manage your cloud infrastructure. Designed with efficiency,
        scalability, and usability at its core, Aurora empowers you to streamline operations and unlock the full
        potential of your cloud resources.
      </p>

      <h2>Our Mission</h2>
      <p>
        At Aurora, our mission is to provide a centralized platform that unifies cloud management. We aim to simplify
        the complexities of provisioning, configuring, and scaling resources across diverse cloud environments while
        enabling seamless growth for your business.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li>
          <strong>Unified Cloud Management:</strong> Consolidates all your cloud assets into one intuitive interface.
        </li>
        <li>
          <strong>Effortless Resource Provisioning:</strong> Quickly provision, configure, and deploy resources like
          servers, networks, and volumes with just a few clicks.
        </li>
        <li>
          <strong>Optimized Scalability:</strong> Built for businesses of all sizes, Aurora grows with you, supporting
          simple environments and intricate multi-cloud setups alike.
        </li>
        <li>
          <strong>Enhanced Productivity:</strong> By reducing operational complexity, Aurora helps your team focus on
          what truly matters—innovating and driving business success.
        </li>
      </ul>

      <h2>Why Choose Aurora?</h2>
      <p>
        Aurora Dashboard is more than just a tool—it's your partner in navigating the cloud. Whether you're a small
        startup or a global enterprise, Aurora provides the flexibility, power, and simplicity you need to achieve your
        goals.
      </p>
      <ul>
        <li>
          <strong>Secure & Reliable:</strong> Your data and operations are safeguarded with enterprise-grade security
          and robust reliability.
        </li>
        <li>
          <strong>Future-Ready:</strong> Aurora is designed to evolve with the latest trends in cloud technology,
          ensuring your solution is always cutting-edge.
        </li>
      </ul>

      <h2>Get Involved</h2>
      <p>
        We are building Aurora Dashboard to serve you better. Your feedback is invaluable in shaping a tool that meets
        the unique needs of businesses like yours. Stay connected and join us as we redefine cloud management.
      </p>
      <p>Together, we can unlock the true potential of your cloud infrastructure.</p>
    </FormattedText>
  )
}

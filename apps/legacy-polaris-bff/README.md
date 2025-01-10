# Aurora Dashboard

Welcome to **Aurora Dashboard**—your central hub for monitoring, managing, and gaining insights into all applications and resources within our monorepo. Aurora Dashboard provides a streamlined, intuitive interface to help you keep track of application performance, deployment statuses, resource utilization, and more—all in one place.

## About Aurora Dashboard

Aurora Dashboard is designed to enhance visibility and control across projects, making it easy for developers and operators to monitor system health and stay informed on key metrics. It consolidates data from multiple sources and presents it in a user-friendly layout, enabling fast, data-driven decision-making.

## Key Features

- **Real-Time Monitoring**: Track the live status of apps, resources, and services.
- **Customizable Dashboards**: Personalize your view with widgets, graphs, and metrics specific to your needs.
- **Alerting and Notifications**: Set up alerts for important events or anomalies to respond quickly to potential issues.
- **Detailed Analytics and Reports**: Access in-depth analytics on application usage, performance, and user engagement.
- **Resource Management**: View and manage resources, deployments, and environments directly from the dashboard.

## Getting Started

Follow these steps to set up and run the project locally:

1. **Clone the Repository**  
   Clone the monorepo to your local machine and navigate to the `aurora-dashboard` directory.

2. **Install pnpm**  
   Ensure you have `pnpm` installed globally. Run:
   ```bash
   npm install -g pnpm
   ```
3. **Install Dependencies**
   Install all necessary dependencies for the monorepo:

   ```bash
   pnpm install
   ```

4. **Run the Dashboard Locally**
   To start both the dashboard and backend locally for development, use:

   ```bash
   pnpm dev
   ```

## Configuring Aurora Dashboard

To tailor Aurora Dashboard to your environment:

- **Environment Variables**: Configure any required environment variables listed in `.env.sample` to connect to your data sources and services.

  If your environment requires customization, follow these steps:

  1.  Navigate to the respective app directory:

      - For the frontend: apps/aurora-portal
      - For the backend: apps/polaris-bff

  2.  Copy the sample environment file:

      ```bash
      cp .env.sample .env
      ```

  3.  Adjust the variables in the .env file to suit your setup.

## Contributing

We welcome contributions to improve the Aurora Dashboard! To contribute:

- Follow the guidelines in `CONTRIBUTING.md`.
- Review existing issues or propose new features.
- Submit a pull request with a clear description and relevant documentation.

For further assistance, check out the **Help & Support** section within the dashboard or reach out to the Aurora Dashboard maintainers.

Happy monitoring with Aurora Dashboard!

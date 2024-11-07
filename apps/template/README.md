# Aurora Template App

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**Template** is a app that allows you to generate new apps under the aurora monorepo structure with ease. It provides a convenient command-line interface for generating app based on predefined templates.

## Features

- Easily generate new app with a single command under `apps/name-of-your-app`
- Customizable configuration for different project types
- Zero configuration

## What is inside?

This project uses many tools like:

- [Vite](https://vitejs.dev)
- [ReactJS](https://reactjs.org)
- [TypeScript](https://www.typescriptlang.org)
- [Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Tailwindcss](https://tailwindcss.com)
- [Eslint](https://eslint.org)
- [Prettier](https://prettier.io)
- [Juno UI components](https://github.com/cloudoperators/juno/tree/main/packages/juno-ui-components)

## Installation and usage

To use the **Template** app as a template to generate your next app, you don't need to install it inside your monorepo. Simply follow the instructions below:

1. Make sure you have Node.js installed on your machine.

2. Open your terminal and navigate to the root directory of your project.

3. Run the following command to install the **Template** app as a global dependency:

```bash
turbo gen workspace --type app --copy @cobaltcore-dev/aurora-app-template
```

All your apps should start with `@cobaltcore-dev/aurora-` prefix.

That's it! You can now use the **Template** app as a template to generate your next app without installing it inside your monorepo.

## Contributing

We welcome contributions from the community. Please follow our [contribution guidelines] to contribute to this project.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

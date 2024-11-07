# Template

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**Template** is a package that allows you to generate new packages with ease. It provides a convenient command-line interface for generating packages based on predefined templates.

## Features

- Easily generate new packages with a single command
- Customizable templates for different project types
- Supports popular configurations like Vite, Vitest, and TypeScript

## Installation and usage

To use the **Template** package as a template to generate your next package, you don't need to install it inside your monorepo. Simply follow the instructions below:

1. Make sure you have Node.js installed on your machine.

2. Open your terminal and navigate to the root directory of your project.

3. Run the following command to install the **Template** package as a global dependency:

```bash
turbo gen workspace --type package --copy @cloudoperators/juno-package-template
```

All your pacakges should start with `@cloudoperators/juno-` prefix.

That's it! You can now use the **Template** package as a template to generate your next package without installing it inside your monorepo.

## Contributing

We welcome contributions from the community. Please follow our [contribution guidelines] to contribute to this project.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

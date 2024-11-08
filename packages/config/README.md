# Collection of Base Configurations for Monorepo

The package name is `@cloudoperators/juno-config`.

- Typescript
- ESlint

## Typescript

This package provides a base TypeScript configuration to be used across multiple packages in a monorepo setup. It ensures consistent TypeScript settings and simplifies the TypeScript setup process for each package.

## Usage

You can use this configuration as a starting point in any package or app within our project using TurboRepo.

```javascript
packages / package - a / src / tsconfig.json
eslint.config.mjs
```

1. **Create a `tsconfig.json` in your package or app:**

```json
{
  "extends": "@cloudoperators/juno-config/typescript/base.json",
  "compilerOptions": {
    "outDir": "./build",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

## ESLint

This package provides also ESLint configuration specifically for TypeScript to be used across multiple packages in a monorepo setup.

## Usage

You can use this configuration as a starting point in any package or app within our project using TurboRepo.

```javascript
packages / package - a / src / tsconfig.json
eslint.config.mjs
```

1. **Create an `eslint.config.mjs` in your package or app:**

```javascript
import junoConfigs from "@cloudoperators/juno-config/eslint/juno.mjs"

export default [
  ...junoConfigs,
  {
    files: ["test/__mocks__/svgLib.js", "src/**/*.test.js"],
    languageOptions: { sourceType: "module" },
  },

  {
    ignores: ["setupTests.js"],
  },
]
```

2. **Create an `eslint.config.mjs` in your package or app specific for typescript:**

```javascript
import junoConfigs from "@cloudoperators/juno-config/eslint/juno-typescript.mjs"

export default [...junoConfigs]
```

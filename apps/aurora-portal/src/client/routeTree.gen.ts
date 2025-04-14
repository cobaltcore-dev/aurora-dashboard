/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from "./routes/__root"
import { Route as AboutImport } from "./routes/about"
import { Route as IndexImport } from "./routes/index"
import { Route as AccountsIndexImport } from "./routes/accounts/index"
import { Route as AuthSigninImport } from "./routes/auth/signin"
import { Route as AccountsAccountIdIndexImport } from "./routes/accounts/$accountId/index"
import { Route as AccountsAccountIdProjectsIndexImport } from "./routes/accounts/$accountId/projects/index"
import { Route as AccountsAccountIdProjectsProjectIdImport } from "./routes/accounts/$accountId/projects/$projectId"
import { Route as AccountsAccountIdProjectsProjectIdNetworkIndexImport } from "./routes/accounts/$accountId/projects/$projectId/network/index"
import { Route as AccountsAccountIdProjectsProjectIdComputeSplatImport } from "./routes/accounts/$accountId/projects/$projectId/compute/$"

// Create/Update Routes

const AboutRoute = AboutImport.update({
  id: "/about",
  path: "/about",
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRoute,
} as any)

const AccountsIndexRoute = AccountsIndexImport.update({
  id: "/accounts/",
  path: "/accounts/",
  getParentRoute: () => rootRoute,
} as any)

const AuthSigninRoute = AuthSigninImport.update({
  id: "/auth/signin",
  path: "/auth/signin",
  getParentRoute: () => rootRoute,
} as any)

const AccountsAccountIdIndexRoute = AccountsAccountIdIndexImport.update({
  id: "/accounts/$accountId/",
  path: "/accounts/$accountId/",
  getParentRoute: () => rootRoute,
} as any)

const AccountsAccountIdProjectsIndexRoute = AccountsAccountIdProjectsIndexImport.update({
  id: "/accounts/$accountId/projects/",
  path: "/accounts/$accountId/projects/",
  getParentRoute: () => rootRoute,
} as any)

const AccountsAccountIdProjectsProjectIdRoute = AccountsAccountIdProjectsProjectIdImport.update({
  id: "/accounts/$accountId/projects/$projectId",
  path: "/accounts/$accountId/projects/$projectId",
  getParentRoute: () => rootRoute,
} as any)

const AccountsAccountIdProjectsProjectIdNetworkIndexRoute = AccountsAccountIdProjectsProjectIdNetworkIndexImport.update(
  {
    id: "/network/",
    path: "/network/",
    getParentRoute: () => AccountsAccountIdProjectsProjectIdRoute,
  } as any
)

const AccountsAccountIdProjectsProjectIdComputeSplatRoute = AccountsAccountIdProjectsProjectIdComputeSplatImport.update(
  {
    id: "/compute/$",
    path: "/compute/$",
    getParentRoute: () => AccountsAccountIdProjectsProjectIdRoute,
  } as any
)

// Populate the FileRoutesByPath interface

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/"
      path: "/"
      fullPath: "/"
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    "/about": {
      id: "/about"
      path: "/about"
      fullPath: "/about"
      preLoaderRoute: typeof AboutImport
      parentRoute: typeof rootRoute
    }
    "/auth/signin": {
      id: "/auth/signin"
      path: "/auth/signin"
      fullPath: "/auth/signin"
      preLoaderRoute: typeof AuthSigninImport
      parentRoute: typeof rootRoute
    }
    "/accounts/": {
      id: "/accounts/"
      path: "/accounts"
      fullPath: "/accounts"
      preLoaderRoute: typeof AccountsIndexImport
      parentRoute: typeof rootRoute
    }
    "/accounts/$accountId/": {
      id: "/accounts/$accountId/"
      path: "/accounts/$accountId"
      fullPath: "/accounts/$accountId"
      preLoaderRoute: typeof AccountsAccountIdIndexImport
      parentRoute: typeof rootRoute
    }
    "/accounts/$accountId/projects/$projectId": {
      id: "/accounts/$accountId/projects/$projectId"
      path: "/accounts/$accountId/projects/$projectId"
      fullPath: "/accounts/$accountId/projects/$projectId"
      preLoaderRoute: typeof AccountsAccountIdProjectsProjectIdImport
      parentRoute: typeof rootRoute
    }
    "/accounts/$accountId/projects/": {
      id: "/accounts/$accountId/projects/"
      path: "/accounts/$accountId/projects"
      fullPath: "/accounts/$accountId/projects"
      preLoaderRoute: typeof AccountsAccountIdProjectsIndexImport
      parentRoute: typeof rootRoute
    }
    "/accounts/$accountId/projects/$projectId/compute/$": {
      id: "/accounts/$accountId/projects/$projectId/compute/$"
      path: "/compute/$"
      fullPath: "/accounts/$accountId/projects/$projectId/compute/$"
      preLoaderRoute: typeof AccountsAccountIdProjectsProjectIdComputeSplatImport
      parentRoute: typeof AccountsAccountIdProjectsProjectIdImport
    }
    "/accounts/$accountId/projects/$projectId/network/": {
      id: "/accounts/$accountId/projects/$projectId/network/"
      path: "/network"
      fullPath: "/accounts/$accountId/projects/$projectId/network"
      preLoaderRoute: typeof AccountsAccountIdProjectsProjectIdNetworkIndexImport
      parentRoute: typeof AccountsAccountIdProjectsProjectIdImport
    }
  }
}

// Create and export the route tree

interface AccountsAccountIdProjectsProjectIdRouteChildren {
  AccountsAccountIdProjectsProjectIdComputeSplatRoute: typeof AccountsAccountIdProjectsProjectIdComputeSplatRoute
  AccountsAccountIdProjectsProjectIdNetworkIndexRoute: typeof AccountsAccountIdProjectsProjectIdNetworkIndexRoute
}

const AccountsAccountIdProjectsProjectIdRouteChildren: AccountsAccountIdProjectsProjectIdRouteChildren = {
  AccountsAccountIdProjectsProjectIdComputeSplatRoute: AccountsAccountIdProjectsProjectIdComputeSplatRoute,
  AccountsAccountIdProjectsProjectIdNetworkIndexRoute: AccountsAccountIdProjectsProjectIdNetworkIndexRoute,
}

const AccountsAccountIdProjectsProjectIdRouteWithChildren = AccountsAccountIdProjectsProjectIdRoute._addFileChildren(
  AccountsAccountIdProjectsProjectIdRouteChildren
)

export interface FileRoutesByFullPath {
  "/": typeof IndexRoute
  "/about": typeof AboutRoute
  "/auth/signin": typeof AuthSigninRoute
  "/accounts": typeof AccountsIndexRoute
  "/accounts/$accountId": typeof AccountsAccountIdIndexRoute
  "/accounts/$accountId/projects/$projectId": typeof AccountsAccountIdProjectsProjectIdRouteWithChildren
  "/accounts/$accountId/projects": typeof AccountsAccountIdProjectsIndexRoute
  "/accounts/$accountId/projects/$projectId/compute/$": typeof AccountsAccountIdProjectsProjectIdComputeSplatRoute
  "/accounts/$accountId/projects/$projectId/network": typeof AccountsAccountIdProjectsProjectIdNetworkIndexRoute
}

export interface FileRoutesByTo {
  "/": typeof IndexRoute
  "/about": typeof AboutRoute
  "/auth/signin": typeof AuthSigninRoute
  "/accounts": typeof AccountsIndexRoute
  "/accounts/$accountId": typeof AccountsAccountIdIndexRoute
  "/accounts/$accountId/projects/$projectId": typeof AccountsAccountIdProjectsProjectIdRouteWithChildren
  "/accounts/$accountId/projects": typeof AccountsAccountIdProjectsIndexRoute
  "/accounts/$accountId/projects/$projectId/compute/$": typeof AccountsAccountIdProjectsProjectIdComputeSplatRoute
  "/accounts/$accountId/projects/$projectId/network": typeof AccountsAccountIdProjectsProjectIdNetworkIndexRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  "/": typeof IndexRoute
  "/about": typeof AboutRoute
  "/auth/signin": typeof AuthSigninRoute
  "/accounts/": typeof AccountsIndexRoute
  "/accounts/$accountId/": typeof AccountsAccountIdIndexRoute
  "/accounts/$accountId/projects/$projectId": typeof AccountsAccountIdProjectsProjectIdRouteWithChildren
  "/accounts/$accountId/projects/": typeof AccountsAccountIdProjectsIndexRoute
  "/accounts/$accountId/projects/$projectId/compute/$": typeof AccountsAccountIdProjectsProjectIdComputeSplatRoute
  "/accounts/$accountId/projects/$projectId/network/": typeof AccountsAccountIdProjectsProjectIdNetworkIndexRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | "/"
    | "/about"
    | "/auth/signin"
    | "/accounts"
    | "/accounts/$accountId"
    | "/accounts/$accountId/projects/$projectId"
    | "/accounts/$accountId/projects"
    | "/accounts/$accountId/projects/$projectId/compute/$"
    | "/accounts/$accountId/projects/$projectId/network"
  fileRoutesByTo: FileRoutesByTo
  to:
    | "/"
    | "/about"
    | "/auth/signin"
    | "/accounts"
    | "/accounts/$accountId"
    | "/accounts/$accountId/projects/$projectId"
    | "/accounts/$accountId/projects"
    | "/accounts/$accountId/projects/$projectId/compute/$"
    | "/accounts/$accountId/projects/$projectId/network"
  id:
    | "__root__"
    | "/"
    | "/about"
    | "/auth/signin"
    | "/accounts/"
    | "/accounts/$accountId/"
    | "/accounts/$accountId/projects/$projectId"
    | "/accounts/$accountId/projects/"
    | "/accounts/$accountId/projects/$projectId/compute/$"
    | "/accounts/$accountId/projects/$projectId/network/"
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AboutRoute: typeof AboutRoute
  AuthSigninRoute: typeof AuthSigninRoute
  AccountsIndexRoute: typeof AccountsIndexRoute
  AccountsAccountIdIndexRoute: typeof AccountsAccountIdIndexRoute
  AccountsAccountIdProjectsProjectIdRoute: typeof AccountsAccountIdProjectsProjectIdRouteWithChildren
  AccountsAccountIdProjectsIndexRoute: typeof AccountsAccountIdProjectsIndexRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AboutRoute: AboutRoute,
  AuthSigninRoute: AuthSigninRoute,
  AccountsIndexRoute: AccountsIndexRoute,
  AccountsAccountIdIndexRoute: AccountsAccountIdIndexRoute,
  AccountsAccountIdProjectsProjectIdRoute: AccountsAccountIdProjectsProjectIdRouteWithChildren,
  AccountsAccountIdProjectsIndexRoute: AccountsAccountIdProjectsIndexRoute,
}

export const routeTree = rootRoute._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/about",
        "/auth/signin",
        "/accounts/",
        "/accounts/$accountId/",
        "/accounts/$accountId/projects/$projectId",
        "/accounts/$accountId/projects/"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/about": {
      "filePath": "about.tsx"
    },
    "/auth/signin": {
      "filePath": "auth/signin.tsx"
    },
    "/accounts/": {
      "filePath": "accounts/index.tsx"
    },
    "/accounts/$accountId/": {
      "filePath": "accounts/$accountId/index.tsx"
    },
    "/accounts/$accountId/projects/$projectId": {
      "filePath": "accounts/$accountId/projects/$projectId.tsx",
      "children": [
        "/accounts/$accountId/projects/$projectId/compute/$",
        "/accounts/$accountId/projects/$projectId/network/"
      ]
    },
    "/accounts/$accountId/projects/": {
      "filePath": "accounts/$accountId/projects/index.tsx"
    },
    "/accounts/$accountId/projects/$projectId/compute/$": {
      "filePath": "accounts/$accountId/projects/$projectId/compute/$.tsx",
      "parent": "/accounts/$accountId/projects/$projectId"
    },
    "/accounts/$accountId/projects/$projectId/network/": {
      "filePath": "accounts/$accountId/projects/$projectId/network/index.tsx",
      "parent": "/accounts/$accountId/projects/$projectId"
    }
  }
}
ROUTE_MANIFEST_END */

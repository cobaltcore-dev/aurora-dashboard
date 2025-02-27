# Signal-Openstack

Signal-Openstack is a library designed to simplify communication with OpenStack APIs. It manages sessions, assists with service discovery, constructs URLs based on provided options, and implements API calls. Think of it as a Swiss Army knife for interacting with OpenStack!

### **Key Features**

- **Authentication**: Supports multiple authentication methods, including `password`, `token`, and `application_credentials`.
- **Service Discovery**: Easily search for services by name, region, and interface within the current token.
- **API Client**: Implements all HTTP methods, while also simplifying the management of query parameters and request bodies.
- **TypeScript Support**: Fully typed for enhanced development experience and code safety.

# Examples

**Create Session with password credentials**

```ts
import { Session } from "@cobaltcore-dev/signal-openstack"

const session = Session({
  auth: {
    identity: {
      methods: ["passowrd"],
      password: {
        user: {
          id: "admin",
          password: "password",
          domain: { name: "Default" },
        },
      },
    },
  },
})

session
  .service("compute", { interfaceName: "internal" })
  .get("servers")
  .then((response) => response.json())
  .then((servers) => console.log(servers))
```

**Create Session with token id**

```ts
import { SignalOpenstackSession } from "@cobaltcore-dev/signal-openstack"

const session = SignalOpenstackSession("http://identity", {
  auth: {
    identity: {
      methods: ["token"],
      token: { id: "Some Bearer Token" },
    },
  },
})

session
  .service("compute", { interfaceName: "internal" })
  .get("servers")
  .then((response) => response.json())
  .then((servers) => console.log(servers))
```

**Rescope Token**

```ts
import { Session } from "@cobaltcore-dev/signal-openstack"

const session = SignalOpenstackSession("http://identity", {
  auth: {
    identity: {
      methods: ["token"],
      token: { id: "Some Bearer Token" },
    },
    scope: {
      project: { id: "123456" },
    },
  },
})

const newAuthToken = await session.getToken().then((token) => token.authToken)
```

# Installation

To install **Signal-Openstack**, you can use one of the following package managers:

### **npm**

```bash
npm install @cobaltcore-dev/signal-openstack
```

### pnpm

```bash
pnpm add @cobaltcore-dev/signal-openstack
```

# API Usage

## SignalOpenstackSession

When creating a session, you can provide options including `headers`, `region`, `interfaceName`, and `debug`. These options are applied to every service and request. You can override them individually for each service or request.

- **constructor**: `(identityEndpoint: string, credentials: AuthConfig, options: SignalOpenstackOptions) -> SignalOpenstackSession`
- **getToken**: `() -> SignalOpenstackToken`
- **terminate**: `() -> void`
- **service**: `(name: string, options: SignalOpenstackOptions) -> Service`

### AuthConfig

[Please read the Openstack Api description](https://docs.openstack.org/api-ref/identity/v3/#password-authentication-with-unscoped-authorization)
**Example**:

```json
{
  "auth": {
    "identity": {
      "methods": ["password"],
      "password": {
        "user": {
          "name": "admin",
          "domain": {
            "name": "Default"
          },
          "password": "devstacker"
        }
      }
    },
    "scope": "unscoped"
  }
}
```

### SignalOpenstackToken

- **authToken**: `string` — The authentication token.
- **availableRegions**: `string[]` — A list of available regions.
- **tokenData**: `string` — The OpenStack response token.
- **isExpired**: `() -> boolean` — Indicates whether the token has expired.
- **hasService**: `(name: string) -> boolean` — Checks if a service is available by name.
- **hasRole**: `(name: string) -> boolean` — Checks if a role is available by name.
- **serviceEndpoint**: `(type: string, options: { region?: string; interfaceName: string }) -> string | null` — Retrieves the service endpoint by type, region, and interface name.

### SignalOpenstackOptions

- **headers**: `Record<string, string>` — Custom headers for requests.
- **debug**: `boolean` — Enables or disables debug logging.
- **region**: `string` — Specifies the region.
- **interfaceName**: `string` — Specifies the interface name.

## Service

Service methods allow you to interact with API endpoints:

- **get**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **head**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **del**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **post**: `(path: string, values: object, options: ActionOptions) -> Promise<Response>`
- **put**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **patch**: `(path: string, options: ActionOptions) -> Promise<Response>`

### ActionOptions

- **queryParams**: `Record<string, string | number | boolean | string[]>` — Query parameters for the request.
- **headers**: `Record<string, string>` — Custom headers for the request.
- **debug**: `boolean` — Enables or disables debug logging.
- **region**: `string` — Specifies the region.
- **interfaceName**: `string` — Specifies the interface name.

# Architecture

![Signal-Openstack Architecture](./docs/SignalOpenstackArch.svg)

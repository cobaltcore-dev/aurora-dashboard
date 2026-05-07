# Signal-Openstack

Signal-Openstack is a library designed to simplify communication with OpenStack APIs. It manages sessions, assists with service discovery, constructs URLs based on provided options, and implements API calls. Think of it as a Swiss Army knife for interacting with OpenStack!

### **Key Features**

- **Authentication**: Supports multiple authentication methods, including `password`, `token`, and `application_credentials`.
- **Service Discovery**: Easily search for services by name, region, and interface within the current token.
- **API Client**: Implements all HTTP methods, while also simplifying the management of query parameters and request bodies.
- **Debug Logging**: Colorized structured logging with automatic sensitive data redaction for secure debugging.
- **Proxy Support**: Built-in support for debugging proxies like mitmproxy with automatic TLS validation handling.
- **TypeScript Support**: Fully typed for enhanced development experience and code safety.

# Examples

**Create Session with password credentials**

```ts
import { SignalOpenstackSession } from "@cobaltcore-dev/signal-openstack"

const session = SignalOpenstackSession("http://identity", {
  auth: {
    identity: {
      methods: ["password"],
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
import { SignalOpenstackSession } from "@cobaltcore-dev/signal-openstack"

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

**Get S3/EC2 Endpoint for AWS SDK**

```ts
import { SignalOpenstackSession } from "@cobaltcore-dev/signal-openstack"
import { S3Client } from "@aws-sdk/client-s3"

const session = SignalOpenstackSession("http://identity", {
  auth: { /* ... */ },
})

// Get the S3 endpoint URL
const s3Service = session.service("s3", { interfaceName: "public" })
const s3Endpoint = s3Service.getEndpoint()

// Use the endpoint with AWS SDK
const s3Client = new S3Client({
  endpoint: s3Endpoint,
  region: "RegionOne",
  credentials: {
    accessKeyId: "your-ec2-access-key",
    secretAccessKey: "your-ec2-secret-key",
  },
})
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
- **debug**: `boolean` — Enables or disables debug logging with colorized output and automatic sensitive data redaction.
- **region**: `string` — Specifies the region.
- **interfaceName**: `string` — Specifies the interface name.
- **proxy**: `ProxyConfig` — Optional proxy configuration for debugging (e.g., mitmproxy).

#### ProxyConfig

- **uri**: `string` — Proxy server URI (e.g., `http://localhost:8080`)

When using a proxy, TLS certificate validation is automatically disabled to support debugging proxies like mitmproxy that use self-signed certificates.

## Service

Service methods allow you to interact with API endpoints:

- **get**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **head**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **del**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **post**: `(path: string, values: object, options: ActionOptions) -> Promise<Response>`
- **put**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **patch**: `(path: string, options: ActionOptions) -> Promise<Response>`
- **getEndpoint**: `(options?: { region?: string; interfaceName?: string }) -> string | null` — Returns the endpoint URL for the current service based on service-level region and interface settings. Useful when you need to pass the endpoint to external clients (e.g., AWS SDK for S3).
- **availableEndpoints**: `() -> Endpoint[]` — Returns all available endpoints for the service.

### ActionOptions

- **queryParams**: `Record<string, string | number | boolean | string[]>` — Query parameters for the request.
- **headers**: `Record<string, string>` — Custom headers for the request.
- **debug**: `boolean` — Enables or disables debug logging with colorized output and automatic sensitive data redaction.
- **region**: `string` — Specifies the region.
- **interfaceName**: `string` — Specifies the interface name.
- **proxy**: `ProxyConfig` — Optional proxy configuration for debugging.

# Debugging

Signal-Openstack includes a built-in structured logger with colorized output and automatic sensitive data redaction for secure debugging.

## Debug Mode

Enable debug logging by setting `debug: true` in your session or service options:

```ts
const session = SignalOpenstackSession("http://identity", {
  auth: { /* ... */ },
}, {
  debug: true  // Enable debug logging
})
```

Debug mode will log:
- Request details (method, URL, headers, body, query parameters)
- Response details (status, headers, body preview)
- Service endpoint resolution
- Automatic redaction of sensitive data (passwords, tokens, secrets)

## Using the Logger

You can also import and use the logger directly in your application:

```ts
import { logger, loggerConfig, redactSensitiveData } from "@cobaltcore-dev/signal-openstack"

// Configure maximum body preview length (default: 500 characters)
loggerConfig.maxBodyPreviewLength = 1000

// Use the logger
logger.info("Operation completed", { result: "success" })
logger.debug("Detailed diagnostics", { data: someObject })
logger.warn("Potential issue detected", { warning: details })
logger.error("Operation failed", { error: errorObject })

// Manually redact sensitive data
const safeData = redactSensitiveData(myObject)
```

## Proxy Debugging with mitmproxy

Signal-Openstack supports proxy debugging for inspecting OpenStack API traffic:

```ts
const session = SignalOpenstackSession("http://identity", {
  auth: { /* ... */ },
}, {
  debug: true,
  proxy: {
    uri: "http://localhost:8080"  // mitmproxy default port
  }
})
```

**Note**: TLS certificate validation is automatically disabled when using a proxy to support debugging tools like mitmproxy that use self-signed certificates.

To set up mitmproxy for debugging:

```bash
# Install mitmproxy
pip install mitmproxy

# Start mitmproxy
mitmproxy --listen-port 8080

# Or use mitmweb for a web interface
mitmweb --listen-port 8080
```

# Architecture

![Signal-Openstack Architecture](./docs/SignalOpenstackArch.svg)

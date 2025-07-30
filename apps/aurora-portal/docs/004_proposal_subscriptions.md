# SSE Architecture Documentation

## Overview

The application integrates with multiple external APIs (e.g., OpenStack) through a Backend for Frontend (BFF) layer. The BFF manages data, business logic, and therefore need to inform the frontend of updates.

The primary goal is to efficiently deliver real-time updates from backend to frontend while minimizing server load. The architecture is designed to support up to 2,000 concurrent users and handle 10 updates per second (From BFF to all clients) across the entire application. The system should support at least 20 Queries which should be updated, with payloads potentially reaching 10 MB.

The system prioritizes maintainability and extensibility, enabling easy addition of new event emitters and consumers. SSE (Server-Sent Events) logic is cleanly separated from business logic to ensure modularity.

## Technical Constraints & Capabilities

Connection Limit: 6 SSE connections per client (browser limitation)
SSE Payload Size: No strict limit, though large payloads may impact performance
SSE Update Frequency: No strict limit; 10 updates/second is well within capacity

### Key Architectural Features

**Unified SSE Connection**: Single connection replaces all individual connections

**Clean Separation**: Domain logic isolated from SSE infrastructure

**Extensible Design**: New update types easily integrated

**Centralized Polling**: Background worker reduces external API load

**Smart Invalidation**: SSE triggers selective cache invalidation, avoiding unnecessary large data transfers

**Loose Coupling**: Business routes remain unaware of SSE implementation

**Data Flow Efficiency**: The system separates concerns by sending lightweight notifications (~bytes) over SSE, while large data payloads are only fetched by clients that actually need the updated data through normal tRPC queries.

## Architecture Principles

- **Single SSE Connection**: One SSE stream for all update types
- **Separation of Concerns**: Domain logic separated from real-time notifications
- **Event-Driven**: Updates triggered by business operations
- **Efficient**: Only sends lightweight notifications, not actual data
- **Scalable**: Easy to add new update types and data sources

## System Components

### Backend Components

#### 1. UpdateService

- **Purpose**: Central notification hub for all updates
- **Responsibilities**:
  - Emit update notifications by type
  - Manage subscriptions to updates
- **Location**: `server/shared/UpdateService.ts`

#### 2. BackgroundWorker

- **Purpose**: Poll external APIs and trigger updates on changes
- **Responsibilities**:
  - Monitor external data sources (e.g., `http://localhost:3000/state`)
  - Detect changes and notify UpdateService
  - Cache last known values to avoid unnecessary notifications
- **Location**: `server/shared/BackgroundWorker.ts`

#### 3. SSE Router

- **Purpose**: Handle SSE connections and stream updates
- **Responsibilities**:
  - Manage SSE subscriptions
  - Broadcast update notifications to connected clients
- **Location**: `server/SSE/sseRouter.ts`

#### 4. Domain Routers

- **Purpose**: Handle business logic and data operations
- **Responsibilities**:
  - Implement domain-specific queries and mutations
  - Trigger update notifications after data modifications
- **Location**: Various domain folders (e.g., `server/Compute/routers/`)

### Frontend Components

#### 1. useSSEUpdates Hook

- **Purpose**: Establish and manage SSE connection
- **Usage**: Initialize once per application
- **Location**: `hooks/useSSEUpdates.ts`

#### 2. useAutoRefetch Hook

- **Purpose**: Automatically refetch queries on specific update types
- **Usage**: Wrap any tRPC query to enable auto-refresh, by invalidating cache
- **Location**: `hooks/useAutoRefetch.ts`

## UML Diagrams

### System Architecture Diagram

```
┌─────────────────────┐
│   External APIs     │
│ ┌─────────────────┐ │
│ │localhost:3000/  │ │
│ │state            │ │
│ └─────────────────┘ │
└──────────┬──────────┘
           │ Data, by e.g. fetching every 2s
           │
┌──────────│─────────────────────────────────────────────┐
│          │          Backend                            │
│ ┌────────▼─────┐   ┌──────────────┐   ┌─────────────┐  │
│ │Background    │──▶│UpdateService │──▶│SSE Router   │  │
│ │Worker        │   │              │   │             │  │
│ └──────────────┘   └──────▲───────┘   └─────────────┘  │
│                           │                            │
│ ┌──────────────┐          │                            │
│ │Progress      │──────────┤                            │
│ │Router        │          │                            │
│ └──────────────┘          │                            │
│ ┌──────────────┐          │                            │
│ │Project       │──────────┤                            │
│ │Router        │          │                            │
│ └──────────────┘          │                            │
│ ┌──────────────┐          │                            │
│ │Compute       │──────────┘                            │
│ │Router        │                                       │
│ └──────────────┘                                       │
└─────────────────────────────────┬──────────────────────┘
                                  │ SSE Stream
                                  ▼
┌────────────────────────────────────────────────────────┐
│                   Frontend                             │
│ ┌─────────────────┐   ┌─────────────────┐              │
│ │useSSEUpdates    │──▶│useAutoRefetch   │              │
│ │Hook             │   │Hook             │              │
│ └─────────────────┘   └─────────┬───────┘              │
│                                 │ refetch              │
│                                 ▼                      │
│                       ┌─────────────────┐              │
│                       │Components       │              │
│                       │                 │              │
│                       └─────────────────┘              │
└────────────────────────────────────────────────────────┘


```

### Sequence Diagram: Update Flow

```
External API  BackgroundWorker  UpdateService  SSE Router  Frontend Client  tRPC Query
     │               │                │            │             │              │
     │ ◄─────────────┤ Poll for       │            │             │              │
     │               │ changes        │            │             │              │
     ├──────────────►│ New data       │ notify     │             │              │
     │               ├───────────────►│ change in  │             │              │
     │               │                │ 'volumes'  │             │              │
     │               │                ├───────────►│ emit update │              │
     │               │                │            │ event       │              │
     │               │                │            ├────────────►│ SSE:         │
     │               │                │            │             │ 'volumes'    │
     │               │                │            │             │ update       │
     │               │                │            │             ├─────────────►│
     │               │                │            │             │ refetch()    │
     │               │                │            │             │◄─────────────┤
     │               │                │            │             │ Fresh data   │
     │               │                │            │             │              │
     │               │     ┌─ Manual Trigger Flow ─┐             │              │
     │               │     │ Volume created        │             │              │
     │               │                ├───────────►│ emit update │              │
     │               │                │            │ event       │              │
     │               │                │            ├────────────►│ SSE:         │
     │               │                │            │             │ 'volumes'    │
     │               │                │            │             │ update       │
     │               │                │            │             ├─────────────►│
     │               │                │            │             │ refetch()    │
     │               │                │            │             │◄─────────────┤
     │               │                │            │             │ Fresh data   │

```

## Data Flow

### 1. Background Updates

```
External API → BackgroundWorker → UpdateService → SSE Router → Client → Refetch
```

### 2. User Action Updates

```
User Action → Domain Router → UpdateService → SSE Router → Client → Refetch
```

## Implementation Benefits

### Performance

- **Single Connection**: Only one SSE connection per client
- **Lightweight**: Only update notifications sent, not data
- **Efficient**: Clients only refetch data they actually use

### Maintainability

- **Separation**: Domain logic separate from real-time concerns
- **Centralized**: All updates flow through single service
- **Extensible**: Easy to add new update types

### Developer Experience

- **Simple Integration**: Wrap any query with `useAutoRefetch`
- **Declarative**: Components declare what updates they care about
- **Debugging**: Centralized logging of all updates

## Usage Examples

### Backend: Triggering Updates

```typescript
// In any domain router or in the BackgroundWorker

import { updateService } from "../../shared/UpdateService"

updateService.notify("projects")
```

```typescript
// UpdateService
export type UpdateType = "volumes" | "projects" | "images" | "compute"

class UpdateService {
  private emitter = new EventEmitter()

  notify(type: UpdateType) {
    this.emitter.emit("update", type)
  }

  subscribe(callback: (type: UpdateType) => void) {
    this.emitter.on("update", callback)
    return () => this.emitter.off("update", callback)
  }
}

export const updateService = new UpdateService()
```

```typescript
import { observable } from "@trpc/server/observable"

export const sseRouter = {
  subscribe: protectedProcedure.subscription(() => {
    return observable<UpdateType>((emit) => {
      const unsubscribe = updateService.subscribe((type) => {
        emit.next(type)
      })
      return unsubscribe
    })
  }),
}
```

### Frontend: Consuming Updates

The system maintains a clear mapping between update types and the queries that should be invalidated:

```typescript
// server/shared/UpdateTypes.ts
export type UpdateType = "projects" | "volumes" | "instances" | "networks"
// ... other types

// Define which queries each update type should invalidate
export const UPDATE_QUERY_MAP = {
  projects: ["projects.getAll", "projects.getById"],
  volumes: ["compute.volumes.getAll"],
} as const
```

```typescript
function App() {
  useSSEUpdates()}

function ProjectsPage() {
  const projectsQuery = trpc.projects.getAll.useQuery()
  useAutoRefetch('projects')
  return <div>{/* Render projectsQuery.data */}</div>
}
```

```typescript
export function useAutoRefetch(updateType: UpdateType) {
  const utils = trpcClient.useUtils()

  useEffect(() => {
    window.addEventListener(`update-${updateType}`, handleUpdate)

    return () => {
      window.removeEventListener(`update-${updateType}`, handleUpdate)
    }
  }, [updateType, utils])
}
```

```typescript
export function useSSEUpdates() {
  trpcClient.sse.subscribe.useSubscription(undefined, {
    onData: (updateType: UpdateType) => {
      window.dispatchEvent(new CustomEvent(`update-${updateType}`))
    },
  })
}
```

## Configuration

### Error Handling

- **API Failures**: BackgroundWorker falls back to cached values
- **SSE Failures**: tRPC handles reconnection automatically
- **Client Errors**: Logged to console, doesn't break functionality

## Future Extensions

- Implement update batching for high-frequency changes
- Add update filtering based on user permissions
- Implement update persistence for offline clients

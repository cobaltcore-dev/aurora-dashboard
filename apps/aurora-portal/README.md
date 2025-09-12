# Aurora Dashboard for OpenStack Cloud Infrastructure

## Vision

Aurora aims to simplify operations for OpenStack-based cloud infrastructure. Our goal is to provide a user-friendly dashboard that enables customers to make main changes easily without the need for complex command-line interactions.

## Key Features

- **User-Friendly UI:** Allows users to connect and manage services seamlessly.
- **No Additional Logic:** Aurora focuses on connecting services through the UI without adding extra processing logic.
- **Simplifies Service Management:** Helps users avoid the complexities of CLI, especially when dealing with UIDs.

## Benefits of Aurora

- **Ease of Use:** Make infrastructure changes with a few clicks.
- **Connect Services effortlessly:** Bridge services visually without manually handling UIDs.
- **Enhanced Productivity:** Reduce operational overhead and improve efficiency.

## Getting Started

(Include instructions on how to install, run, or access the dashboard here.)

## Policy Engine Configuration

The Aurora Portal uses a hierarchical policy loading system that supports custom policy overrides for flexible permission management.

### How It Works

The policy engine loader follows a simple override mechanism:

1. **Check for custom policies first** - Looks in `./permission_custom_policies/` directory
2. **Fallback to default policies** - Uses `./permission_policies/` if no custom policy exists
3. **Load the policy engine** - Creates a policy engine instance from the selected file

```typescript
export const loadPolicyEngine = (fileName: string) => {
  let file: string
  if (fs.existsSync(path.join(__dirname, `./permission_custom_policies/${fileName}`))) {
    file = path.join(__dirname, `./permission_custom_policies/${fileName}`)
  } else {
    file = path.join(__dirname, `./permission_policies/${fileName}`)
  }
  return createPolicyEngineFromFile(file)
}
```

### Directory Structure

```
src/server/
├── permission_policies/          # Default policy files
│   ├── compute.yaml              # Default compute permissions
│   ├── network.yaml              # Default network permissions
│   └── storage.yaml              # Default storage permissions
└── permission_custom_policies/   # Custom policy overrides (optional)
    ├── compute.yaml              # Custom compute permissions (overrides default)
    └── network.yaml              # Custom network permissions (overrides default)
```

### Usage Examples

#### Loading Default Policies

```typescript
// Loads from ./permission_policies/compute.yaml
const policyEngine = loadPolicyEngine("compute.yaml")
```

#### Loading Custom Policies

```typescript
// If ./permission_custom_policies/compute.yaml exists, loads that file
// Otherwise, falls back to ./permission_policies/compute.yaml
const policyEngine = loadPolicyEngine("compute.yaml")
```

### Benefits

- Environment-specific overrides - Deploy different policies for dev/staging/production
- Zero downtime policy updates - Override specific policies without changing the main codebase
- Gradual rollouts - Test new policies by overriding specific files
- Fallback safety - Always has default policies to fall back to

### Policy File Format

Policy files should follow the OpenStack policy syntax using YAML or JSON format.

#### Example: compute.yaml

```yaml
context_is_admin: role:cloud_compute_admin
member: role:member and rule:owner_or_no_project
viewer: role:compute_viewer and rule:owner_or_no_project
admin: role:compute_admin and rule:owner_or_no_project

os_compute_api:servers:index: rule:context_is_viewer
os_compute_api:servers:create: rule:context_is_editor
os_compute_api:servers:delete: rule:context_is_admin
```

### Deployment Considerations

- Custom policies are optional - The system works without any custom policies
- File precedence - Custom policies completely override default policies (no merging)
- File validation - Ensure custom policy files are valid YAML and follow the expected schema
- Version control - Consider whether to include custom policies in version control or manage them separately

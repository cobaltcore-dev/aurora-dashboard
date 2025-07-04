# Requirements Document: OpenStack Flavors Control in Aurora Dashboard

## 1. Purpose

This document specifies the business and functional requirements for implementing **Flavors Control** within the Aurora Dashboard, integrated with an OpenStack-based backend. The feature will empower users and administrators to manage VM instance types by defining and controlling CPU, RAM, disk, and networking specifications through an intuitive user interface. It supports:

- Listing available flavors
- Creating new flavors (admin-only)
- Deleting flavors (admin-only)
- Editing flavor metadata (admin-only)
- Managing flavor access control (admin-only)

## 2. Background

Flavors in OpenStack define the hardware configuration templates for virtual machines (VMs), including CPU, memory, and storage parameters. Currently, flavor management exists in the legacy Elektra dashboard, which suffers from permission synchronization issues and outdated UI/UX. Aurora Dashboard aims to replace Elektra with a modern, consistent, and permission-synchronized interface.

## 3. Scope

### In Scope

- Displaying flavors in a responsive, sortable, and paginated table.
- Initiating creation of new flavors (admin-only).
- Initiating deletion of flavors with confirmation (admin-only).
- Editing flavor metadata (key-value pairs) (admin-only).
- Managing flavor access control by assigning/removing projects (admin-only).
- Input validation and error handling.
- Permission enforcement both frontend and backend.
- URL state management for list and detail views.

### Out of Scope

- Editing flavor core attributes (name, vCPU, RAM, disk) after creation.
- Backend provisioning of flavors beyond API support.
- Integration with quota management or billing.
- Flavor cloning or bulk operations.

## 4. User Roles and Permissions

| Role  | Permissions                                                                                 |
|-------|---------------------------------------------------------------------------------------------|
| Admin | List, View Details, Create, Delete, Edit Metadata, Manage Access Control                    |
| User  | List, View Details only                                                                     |

- Permissions must be enforced both in the frontend UI and backend API.
- The system should retrieve user roles dynamically from the backend or context.

## 5. UI Components

- **Flavors Table**
  - Columns: Name/ID, vCPU, RAM (MB), Root Disk (GB), Ephemeral Disk (GB), Swap (MB), RX/TX Factor, Public, Actions.
  - Supports sorting and pagination.
  - Responsive layout for desktop and mobile.

- **Create Flavor Modal**
  - Input fields: Name, vCPU, RAM, Root Disk, Ephemeral Disk, Swap Disk, RX/TX Factor.
  - Validation feedback inline.
  - Submit and Cancel controls.

- **Delete Confirmation Modal**
  - Displays flavor name and warning about deletion.
  - Confirm and Cancel controls.

- **Edit Metadata Modal**
  - List existing key-value metadata pairs.
  - Provide a mechanism to add new key-value pairs.
  - Provide a mechanism to remove existing pairs.
  - Save and Cancel controls.

- **Access Control Modal**
  - List projects with access to the flavor.
  - Provide a mechanism to add or remove projects.
  - Save and Cancel controls.

## 6. Functional Requirements

### FR1: List Flavors

- **FR1.1**: Retrieve the list of flavors from the OpenStack API.
- **FR1.2**: Present flavors in a paginated, sortable table.
- **FR1.3**: Display an empty state when no flavors exist.
- **FR1.4**: Handle API errors gracefully with user feedback.
- **FR1.5**: Ensure the table layout is responsive across devices.

### FR2: Create Flavor

- **FR2.1**: Provide a mechanism for users with admin role to initiate flavor creation.
- **FR2.2**: Present a dialog/modal to capture flavor creation inputs.
- **FR2.3**: Include inputs for Name, vCPU, RAM, Root Disk, Ephemeral Disk, Swap Disk, RX/TX Factor.
- **FR2.4**: Validate inputs on the client side before submission.
- **FR2.5**: Submit creation request to the backend API.
- **FR2.6**: Provide feedback on loading, success, and error states.
- **FR2.7**: Refresh the flavor list upon successful creation and close the creation interface.

### FR3: Input Validation

- **FR3.1**: Require all mandatory fields to be completed.
- **FR3.2**: Validate Name as a non-empty string between 2 and 50 characters.
- **FR3.3**: Validate vCPU as an integer ≥ 1.
- **FR3.4**: Validate RAM as an integer ≥ 128 MB.
- **FR3.5**: Validate Root Disk as an integer ≥ 0.
- **FR3.6**: Validate Ephemeral Disk as an integer ≥ 0.
- **FR3.7**: Validate Swap Disk as an integer ≥ 0.
- **FR3.8**: Validate RX/TX Factor as an integer ≥ 1.
- **FR3.9**: Present inline validation errors for each field as needed.

### FR4: Delete Flavor

- **FR4.1**: Provide a mechanism for authorized users to initiate flavor deletion.
- **FR4.2**: Present a confirmation dialog showing flavor details and deletion warning.
- **FR4.3**: Submit deletion request to the backend API upon confirmation.
- **FR4.4**: Indicate loading state during deletion.
- **FR4.5**: Remove the flavor from the list and provide success feedback upon completion.
- **FR4.6**: Present error feedback if deletion fails.

### FR5: Edit Flavor Metadata

- **FR5.1**: Provide a mechanism for admins to initiate editing of flavor metadata.
- **FR5.2**: Display existing metadata key-value pairs.
- **FR5.3**: Enable addition of new metadata key-value pairs.
- **FR5.4**: Enable removal of existing metadata pairs.
- **FR5.5**: Validate metadata keys and values as non-empty strings.
- **FR5.6**: Submit metadata changes to the backend API.
- **FR5.7**: Provide success and error feedback and refresh metadata display on success.

### FR6: Manage Flavor Access Control

- **FR6.1**: Provide a mechanism for admins to manage project access for flavors.
- **FR6.2**: Display projects currently granted access to the flavor.
- **FR6.3**: Enable addition and removal of projects from access control.
- **FR6.4**: Submit access control changes to the backend API.
- **FR6.5**: Provide feedback on success or failure and refresh the access list accordingly.



## 7. Non-Functional Requirements

| ID    | Requirement                                           |
|-------|-------------------------------------------------------|
| NFR1  | UI shall conform to Juno UI design system             |
| NFR2  | User actions (create/delete/edit) respond within 2 sec|
| NFR3  | Table supports sorting and pagination for >10 rows    |
| NFR4  | System must comply with accessibility standards (WCAG 2.1 AA) |
| NFR5  | All API communications secured via HTTPS              |
| NFR6  | Audit logging of flavor creation, deletion, and edits |

## 8. Success Metrics

- 100% of admin users can successfully create, delete, edit metadata, and manage access control for flavors.
- Validation errors prevent invalid flavor definitions.
- Unauthorized users are unable to access admin-only features.
- UI feedback clearly communicates success and failure states.
- Flavor list loads and updates within 2 seconds.
- No permission synchronization issues as experienced in the legacy Elektra dashboard.

---

## 9. Architecture Notes: Permission Discovery and Caching

The Aurora Dashboard uses a **Backend-for-Frontend (BFF)** layer to centralize permission management. The BFF dynamically discovers the current user’s permissions related to flavor management and caches them to optimize frontend permission checks and improve performance.

**Important:**  
The specific mechanisms, protocols, or workflows by which the BFF retrieves, refreshes, and caches these permissions—such as integration with identity providers, authentication flows, or session management—**are outside the scope of this Business Requirements Document**.

This document assumes that the BFF exposes an API endpoint providing the frontend with the current user’s effective permissions in a timely and secure manner. The detailed design and implementation of permission discovery and caching will be addressed separately in technical and architectural documentation.

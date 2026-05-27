# Clavis / PCA

This document tracks the Clavis integration in Aurora Portal. The initial backend and UI pieces are implemented, and this note is meant to evolve as the feature grows.

## Current Scope

The feature currently covers project-scoped management of private certificate authorities (PCAs):

- list certificate authorities for a project
- create a certificate authority
- delete a certificate authority
- import a certificate chain for a CA
- list certificates issued by a certificate authority
- fetch certificate authority and certificate details by id
- create certificates under a certificate authority

## Implemented UI

The active UI entry point is the project service route at `/projects/$projectId/services/pca/`.

Implemented screens and interactions:

- PCA list page with loading, error, and empty states
- primary action to create a certificate authority
- row action menu with delete certificate authority
- create modal with FQDN/common name validation
- delete modal with explicit confirmation by typing `delete`
- CA details page at `/projects/$projectId/services/pca/$pcaId/` via `PcaDetailsView`
- details page shows CA metadata, certificate validity, CSR content, and delete action
- details-page delete flow reuses the shared delete modal and redirects back to the PCA list after success
- certificate list view via `PcaCertificatesListContainer` displays certificates issued by a CA
- certificates list shows CA ID and certificate ID columns with loading, error, and empty states
- disabled "Issue End Entity Certificate" button (placeholder for future issue-certificate task)
- individual certificate rows rendered via `PcaCertificatesTableRow` component

The PCA list page renders the CA state, id, and common name with translated empty states when no PCAs are available for the current project.
The certificate list view integrates within the CA details view and fetches certificates via the `listCertificates` endpoint.

## Implemented BFF

The PCA router is project-scoped and talks to the OpenStack PCA / Clavis service.

| Procedure            | OpenStack path                                                                          | Purpose                                         |
| -------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `list`               | `GET /certificate-authorities`                                                          | List all certificate authorities in the project |
| `create`             | `POST /certificate-authorities`                                                         | Create a new certificate authority              |
| `getById`            | `GET /certificate-authorities/{certificate_authority_id}`                               | Fetch certificate authority details             |
| `delete`             | `DELETE /certificate-authorities/{certificate_authority_id}`                            | Permanently delete a certificate authority      |
| `import`             | `POST /certificate-authorities/{certificate_authority_id}:importCertificate`            | Import the certificate chain for a CA           |
| `listCertificates`   | `GET /certificate-authorities/{certificate_authority_id}/certificates`                  | List certificates issued by a CA                |
| `createCertificate`  | `POST /certificate-authorities/{certificate_authority_id}/certificates`                 | Create a new certificate under a CA             |
| `getByIdCertificate` | `GET /certificate-authorities/{certificate_authority_id}/certificates/{certificate_id}` | Fetch certificate details                       |

All endpoints expect `project_id` in the request context or input and use the OpenStack service client exposed by the Aurora BFF.

## Data Model Notes

Relevant PCA states are:

- `CREATING`
- `AWAITING_CERTIFICATE`
- `READY`
- `FAILED`
- `UNEXPECTED`

A newly created CA starts in `CREATING`. Once its CSR is generated, it moves to `AWAITING_CERTIFICATE`. Importing the certificate chain transitions it to `READY`, at which point it can issue end-entity certificates.

The CA schema also includes:

- `configuration.subject.common_name`
- `csr`
- `certificate`
- `certificate_chain`
- `imported_certificate_chain`
- `project_id`

## UX and Validation

The create flow currently validates the common name as an FQDN-style value. The delete flow requires a typed confirmation to reduce accidental removal of a CA and its associated certificates.

Error states are surfaced directly in the modal or list view when the BFF call fails.

## Next Areas To Document

The backend already exposes certificate and import operations, but the UI does not yet have dedicated screens for:

- certificate detail view
- certificate import flow
- list filtering, sorting, and search controls

Those can be documented once the corresponding UI work lands.

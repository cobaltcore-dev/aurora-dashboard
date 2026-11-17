# Volumes API verification and deployment contract

Research date: 2026-11-16. Upstream Cinder API/source verified; **live deployment checks are not completed**.

## First PR scope — #1474, #1475, #1476

This first increment contains the API investigation/checklist, catalog- and permission-gated scope shell with placeholder Volumes/Snapshots list routes, and the complete read-only BFF. Resource lists, detail pages, relationship links, manual refresh controls, and authenticated E2E follow in later PRs. The implementation contract below describes the complete feature target, not functionality already delivered by this first increment. #1474 is not complete until the live release-gate checks are recorded.

## Confirmed upstream behavior

- [Block Storage API v3](https://docs.openstack.org/api-ref/block-storage/v3/): detail-list and show endpoints expose the required fields. Sizes are GiB. Missing/denied resources may yield 404. Volumes and snapshots are distinct from Glance image resources.
- [Snapshot controller](https://github.com/openstack/cinder/blob/master/cinder/api/v3/snapshots.py) and [resource filter defaults](https://github.com/openstack/cinder/blob/master/etc/cinder/resource_filters.json): `volume_id` is a supported snapshot filter. Since 3.31 allowed filters are configurable; 3.33 introduces the resource-filters discovery API.
- [Pagination implementation](https://github.com/openstack/cinder/blob/master/cinder/api/common.py): requests without `limit` still cap at `osapi_max_limit` (default 1000). Follow collection `next` links. A final full page may advertise a next link that leads to an empty page.
- [Volume response builder](https://github.com/openstack/cinder/blob/master/cinder/api/v3/views/volumes.py): `bootable` is a lowercase string boolean; attachments are a collection of completed records. `attachment_id` identifies the attachment, whereas historical `id` identifies the volume. No separate attachments or volume-types calls are required for this feature.
- [Microversion history](https://github.com/openstack/cinder/blob/master/cinder/api/openstack/rest_api_version_history.rst): missing version header selects 3.0. `volume_type_id` is added at 3.63 and is not required for displaying/filtering the existing `volume_type` value. Projectless URLs are supported by newer API servers; use the catalog endpoint instead of constructing them.
- [Volume policies](https://github.com/openstack/cinder/blob/master/cinder/policies/volumes.py) and [snapshot policies](https://github.com/openstack/cinder/blob/master/cinder/policies/snapshots.py): list/show actions are independently named `volume:get_all`, `volume:get`, `volume:get_all_snapshots`, `volume:get_snapshot`.

## Implementation

- tRPC namespace `volume.*`, registered in `buildBaseRouter`, exposes four queries and `canUser`. No mutation procedures.
- Request paths are relative to the selected Cinder v3 catalog endpoint. Header: `OpenStack-API-Version: volume 3.0`. Never request `all_tenants`. Each request has a 30-second deadline combined with client-disconnection cancellation.
- The BFF aggregates list pages and validates continuation origin/path, filter, and advancing markers. It reconstructs requests using local paths rather than forwarding an arbitrary URL with a Keystone token.
- Volume detail performs a show request and one scoped snapshot query; that query may require multiple backend pages. All resource search/sort/filter is local, without additional requests.
- A show response belonging to another project is rejected. For an admin token, an absent ownership field is also rejected rather than exposing an unverifiable resource. Configure Cinder's tenant/extended-snapshot attributes appropriately for project-only admin detail reads.
- One cached permission query is shared throughout the client. Nav/card visibility honors catalog, service allow/deny configuration, and list capabilities. Show permissions are independent. Link text is an ID, never resolved by a Nova/Cinder name request.
- Both lists and detail routes ship together. Manual refresh is included; no polling/SSE. Volume detail uses relationship sub-tabs and independent snapshot errors.

## Policy compatibility

`apps/dashboard/src/policies/volume.json` provides the four read actions using an admin-or-project-reader starting rule. It is **not a verified copy of the target deployment's effective policy**. Operators must align it with Cinder's actual defaults, overrides, role implications, and all referenced rules before enabling the scope. A sparse Cinder overrides file alone is not necessarily sufficient for Aurora's evaluator.

External consumers must provide `<policyDir>/volume.json`. Missing files deny Cinder only and do not fail Aurora startup. Malformed present files remain explicit configuration errors, not silent permission denials. Policy is loaded on first Cinder permission check; restart the server after replacing a loaded policy file.

The local check is an Aurora access gate; Cinder remains the final resource authorization authority. A positive `canUser` result does not guarantee that a specific volume or snapshot is accessible.

## Release gate — #1474

- [ ] Record actual catalog type/name, selected region/interface, endpoint URL, Cinder release and supported microversions. Common types: `volumev3`, `block-storage`, `volume`; server rejects non-v3 endpoints.
- [ ] Compare the four effective read-policy actions against Aurora's file using the intended project-reader and admin personas. Verify nav/card denial, direct-route denial, and independent snapshot denial.
- [ ] Verify scoped `volume_id` filtering and all-page aggregation with a reader token. Do not infer success from HTTP 200 alone; check returned source IDs.
- [ ] Verify detail ownership attributes for project-scoped admin requests and rejection of another project's resource.
- [ ] Exercise attached/unattached and multiattached volumes, nullable attachment fields, string booleans, metadata, cloned/from-snapshot sources, unknown/error/transitional states, and empty/403/404/5xx cases.
- [ ] Run authenticated Playwright volumes tests against a seeded project. No deployment credentials or private identifiers belong in this document.

GitHub epic/child descriptions still need corresponding updates; this branch changes repository docs only.

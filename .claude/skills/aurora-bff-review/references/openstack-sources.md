# OpenStack sources

Use the current official documentation, not memory. Cite the URL and section in findings.

## API reference (behaviour, parameters, responses)

| Service                      | API reference                                                  |
| ---------------------------- | -------------------------------------------------------------- |
| Networking (Neutron)         | https://docs.openstack.org/api-ref/network/v2/index.html       |
| Compute (Nova)               | https://docs.openstack.org/api-ref/compute/                    |
| Image (Glance)               | https://docs.openstack.org/api-ref/image/v2/index.html         |
| Block Storage (Cinder)       | https://docs.openstack.org/api-ref/block-storage/v3/index.html |
| Object Storage (Swift)       | https://docs.openstack.org/api-ref/object-store/index.html     |
| Identity (Keystone)          | https://docs.openstack.org/api-ref/identity/v3/index.html      |
| DNS (Designate)              | https://docs.openstack.org/api-ref/dns/                        |
| Load Balancer (Octavia)      | https://docs.openstack.org/api-ref/load-balancer/v2/index.html |
| Shared File Systems (Manila) | https://docs.openstack.org/api-ref/shared-file-system/         |

The rendered pages are long. Fetch them and search for the resource's section (e.g. `#ports`, `#routers-routers`).

## Machine-readable source (exact parameter lists)

When you need exact field names, types and whether a field is required or optional, the API-ref sources are more precise than the rendered page:

- **Neutron:** `https://raw.githubusercontent.com/openstack/neutron-lib/master/api-ref/source/v2/<resource>.inc` for the request/response tables per endpoint, and `.../v2/parameters.yaml` for each parameter's type, `in` (path/query/body), `required` flag and description.
- **Other services:** the same layout under `https://raw.githubusercontent.com/openstack/<project>/master/api-ref/source/` (e.g. `nova`, `glance`, `cinder`).

Each `.inc` file lists the parameters per endpoint (e.g. `- port_id: port_id-path`), and `parameters.yaml` defines them. Use this to check:

- query filters and sort keys the BFF forwards;
- body fields and their wrapping (e.g. `{ "port": { ... } }`);
- the documented **normal** and **error** response codes per endpoint;
- extension-dependent fields (the description names the extension).

## Policy (permissions)

The default policy rules, i.e. who may read or set which attribute, are in the service's code:

- **Neutron:** `https://raw.githubusercontent.com/openstack/neutron/master/neutron/conf/policies/<resource>.py` (singular file names, e.g. `port.py`, `router.py`). Attribute-level rules look like `create_port:binding:host_id` or `get_router:distributed`.
- **Other services:** `<project>/<project>/policies/*.py` (e.g. `nova/nova/policies/`).

Use this when the epic mentions permissions, or when a field may be admin-only, which affects whether a schema field must be optional. The deployment's actual policy can differ, so the docs give you the defaults only. Classify policy-dependent findings with confidence "Likely", unless the epic says which policy applies.

## Extensions

Many fields exist only when an extension is enabled (e.g. `dvr`, `extraroute`, `port-security`, `binding`). The API reference names the extension per field. The BFF must not require such fields in response schemas.

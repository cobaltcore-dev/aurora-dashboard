/**
 * Mirrors the backend's service resolution, which matches by NAME and ignores the
 * catalog type entirely (cephProcedure.ts:23 → ctx.openstack.service("ceph");
 * swiftRouter.ts → service("swift"); signal-openstack session.ts:95 takes only a name).
 * The old type-scoped lookups disagreed with it: Ceph lives in the catalog as
 * { type: "object-store-ceph", name: "ceph" }, so serviceIndex["object-store"]["ceph"]
 * never matched, and a temporary Ceph availability fallback had to paper over it.
 */
export const hasServiceByName = (serviceIndex: Record<string, Record<string, boolean>>, name: string): boolean =>
  Object.values(serviceIndex).some((byName) => byName[name])

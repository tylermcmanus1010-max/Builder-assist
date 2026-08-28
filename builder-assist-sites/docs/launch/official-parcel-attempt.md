# Authoritative parcel retrieval attempt

Access date: **2026-08-27**

Target controls from the supplied plans:

- Address: 12228 N 66th St, Scottsdale, AZ 85254.
- Conflicting subject APNs printed in the set: 175-08-001B and 175-08-001A.
- Conflicting lot areas: 31,350 sf and 37,221 sf / 0.8542 ac.

The exact Maricopa County Assessor property URL for `17508001B` was found and
opened twice during the research/verification pass. Both direct retrievals
returned HTTP 403. The official county parcel MapServer metadata was accessible
and confirmed a query-capable polygon layer titled `Parcels`, authored by the
Maricopa County Assessor's Office, in Web Mercator (WKID 102100 / latest 3857).
The exact layer and query endpoints returned 403 or were rejected by the safe
web-access boundary, so no subject feature, boundary coordinates, area,
frontage, or adjacent record was retrieved.

Official endpoints inspected:

- `https://mcassessor.maricopa.gov/mcs/?mod=pd&q=17508001B` — HTTP 403.
- `https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer?f=pjson`
  — service metadata accessible; dynamic parcel polygons; Query capability.
- Layer/query endpoints under `/Parcels/MapServer/0` — HTTP 403 or access-policy
  rejection.

Result: **UNVERIFIED / launch-blocking for parcel field use.** Search snippets,
the plan conflict, and service-level metadata are not substituted for the actual
parcel record. The subject polygon, verified APN, legal dimensions, frontage,
ROW relation and adjacent parcel IDs remain unavailable. Builder Assist keeps
its field-use gate closed and displays only plan-sourced provisional context.

Required external resolution: an authorized official parcel/plat export for the
subject and adjacent parcels, including record date and coordinate system, or a
recorded survey/plat supplied by the project team. That artifact must then be
reconciled to the civil control and the plan APN/area conflicts.

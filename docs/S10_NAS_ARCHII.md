# Archii × S10-NAS — NEXO private storage

This feature adds a private project-file browser for **one tenant only: NEXO**.

It does **not** turn the S10-NAS into a global Archii multi-tenant storage service.

## Architecture

```
Archii browser
  -> /api/nas (Vercel, Firebase-authenticated)
  -> authenticated HTTPS bridge
  -> 127.0.0.1:8770 on S10
  -> 127.0.0.1:8766 WebDAV
  -> SAF gateway
  -> HDD CED8-A378
```

The existing WebDAV service remains loopback-only. The bridge also binds only to
`127.0.0.1`; a separate HTTPS tunnel must publish **only the bridge**, not WebDAV.

## Tenant isolation

The server requires all of the following:

1. Valid Firebase ID token.
2. Membership in the requested tenant.
3. `tenantId === NAS_TENANT_ID`.
4. Requested project exists.
5. Project's `tenantId` matches the NEXO tenant.

Other tenants receive a 404 for the NAS integration and the NAS panel stays hidden.

## Environment variables (Vercel)

```env
NAS_ENABLED=true
NAS_TENANT_ID=<firestore document id of NEXO tenant>
NAS_BRIDGE_URL=https://<private authenticated tunnel hostname>
NAS_BRIDGE_TOKEN=<long random secret shared only with the bridge>
NAS_REQUEST_TIMEOUT_MS=15000
NAS_API_UPLOAD_MAX_MB=4
```

`NAS_TENANT_ID` is the Firestore **document ID**, not the tenant display name.

The repository intentionally does not hardcode the NEXO tenant ID.

## S10 bridge

Source:

```
scripts/s10-nas-bridge.py
```

Required environment on Termux:

```sh
export ARCHII_NAS_BRIDGE_TOKEN='<same secret as Vercel>'
export ARCHII_NAS_BRIDGE_HOST='127.0.0.1'
export ARCHII_NAS_BRIDGE_PORT='8770'
export ARCHII_NAS_WEBDAV='http://127.0.0.1:8766'
python scripts/s10-nas-bridge.py
```

The bridge will refuse to start on a non-loopback address.

### Bridge root

Every project is jailed under:

```
/S10-NAS/Projects/<projectId>/
```

The client never supplies an absolute Android path.

On first initialization the bridge creates:

```
01_Planos/
02_Renders/
03_Presupuestos/
04_Contratos/
05_Fotos/
06_Entregables/
```

## Archii UI

In **Proyecto -> Archivos**, NEXO users see a new `S10-NAS · NEXO` panel.

Current phase supports:

- project storage initialization
- folder navigation
- create folder
- list
- small web uploads
- download
- rename
- delete
- refresh/status

OneDrive is intentionally left untouched and remains optional below the NAS panel.

## Important phase-1 limitation: uploads

The current Vercel proxy intentionally defaults to a **4 MB upload limit**.

This is suitable for documents and small images, but not for large renders, videos,
DWG/RVT archives, or other architectural assets.

Large files should continue to be copied directly through the mounted desktop NAS
until a signed direct-upload flow is implemented. Do not raise this limit blindly:
serverless request-size limits apply before application code can process the body.

## Security rules

Do not:

- expose WebDAV `8766` publicly
- bind WebDAV or the bridge to `0.0.0.0`
- reuse the Firebase bearer token as the bridge secret
- put `NAS_BRIDGE_TOKEN` in `NEXT_PUBLIC_*`
- hardcode the NEXO tenant ID into client-side authorization logic
- allow user-supplied absolute filesystem paths
- remove server-side project/tenant validation

## Activation checklist

Before enabling in production:

- [ ] Determine the actual NEXO Firestore tenant document ID.
- [ ] Generate a long random bridge token.
- [ ] Install/start the bridge on Termux.
- [ ] Publish only `127.0.0.1:8770` through an authenticated HTTPS tunnel.
- [ ] Set the Vercel environment variables.
- [ ] Confirm `/api/nas?action=status` returns 200 for NEXO.
- [ ] Confirm a different tenant receives 404.
- [ ] Pilot with one NEXO project.
- [ ] Test list -> mkdir -> upload -> download/hash -> rename -> delete.
- [ ] Confirm all files physically appear under the project's HDD directory.

## Future phase

Recommended next enhancement is a short-lived signed direct-upload channel so large
files can travel browser -> bridge without passing through the Vercel request body.
The Vercel API should still issue and authorize the upload ticket, keeping NEXO tenant
and project isolation on the server.

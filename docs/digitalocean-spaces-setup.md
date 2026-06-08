# DigitalOcean Spaces for live-class recordings

How Teams live-class recordings are stored on **DigitalOcean Spaces** (TTII-owned
storage) and replayed to students.

> **"S3" = the protocol, not Amazon.** DigitalOcean Spaces speaks the S3 API, so
> the storage provider is named `s3`. With `STORAGE_PROVIDER=s3` + the
> DigitalOcean endpoint, this uses **DigitalOcean Spaces**, not Amazon AWS.

---

## ✅ Status: LIVE in production (verified 2026-06-08)

Production is already configured and working. Verified end-to-end against the
real Space (upload → signed-URL download → delete round-trip all green; private
objects correctly return 403 on their public URL).

Current production config (`/opt/ttii-lms/.env`):

| Var | Value |
|---|---|
| `STORAGE_PROVIDER` | `s3` |
| `S3_BUCKET` | `ttii-lms-recordings` |
| `S3_REGION` | `sgp1` (Singapore) |
| `S3_ENDPOINT` | `https://sgp1.digitaloceanspaces.com` |
| `S3_FORCE_PATH_STYLE` | `false` (virtual-hosted style) |
| `S3_PUBLIC_BASE_URL` | `https://ttii-lms-recordings.sgp1.cdn.digitaloceanspaces.com` (Spaces CDN) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | set (Spaces keys) |

The Teams artifacts cron is armed (`intervalMs: 300000`) and the API is healthy.
No real recording has flowed through **yet** — that only happens once a Teams
live class is actually *recorded* and ends; see "Confirm with a real recording".

---

## How it works (already built — no code change needed)

- A cron (every 5 min) finds recently-ended Teams live classes, downloads the
  recording from Microsoft Graph, and uploads it through the storage provider
  (`apps/api/src/jobs/teams-artifacts-sync.ts`).
- With `STORAGE_PROVIDER=s3` that provider is DigitalOcean Spaces
  (`apps/api/src/integrations/storage-provider.ts` → `S3StorageProvider`).
- The recording's storage key is saved on `live_class.recording_storage_key`.
- Students / instructors / admins play it via a **short-lived signed URL**
  (objects stay private — no public bucket):
  - `GET /api/student/live_classes/recording-url`
  - `GET /api/instructor/live-classes/:id/recording-url`
  - `GET /api/admin/live_classes/recording-signed-url`

---

## Verify the live pipeline (ops)

**1. Storage round-trip against the real Space** (non-destructive; uploads then
deletes a tiny `healthcheck/` object). Run on the droplet so secrets stay put:

```bash
ssh root@68.183.94.1 'cat > /tmp/spaces-verify.mjs <<"EOF"
import { createIntegrationRegistry } from "/opt/ttii-lms/apps/api/dist/integrations/registry.js";
const reg = createIntegrationRegistry();
const key = "healthcheck/spaces-verify-" + Date.now() + ".txt";
const body = "ttii-spaces-healthcheck";
const up = await reg.storage.uploadObject({ key, body, contentType: "text/plain" });
const signed = await reg.storage.createSignedDownloadUrl({ key, expiresInSeconds: 120 });
const res = await fetch(signed);
const ok = (await res.text()) === body;
await reg.storage.deleteObject({ key });
console.log(JSON.stringify({ provider: reg.storage.name, signedStatus: res.status, bytesMatch: ok }));
EOF
node --env-file=/opt/ttii-lms/.env /tmp/spaces-verify.mjs; rm -f /tmp/spaces-verify.mjs'
```
Expect `{"provider":"s3-storage","signedStatus":200,"bytesMatch":true}`.

**2. Cron health** — look for the arm line and any sync activity:
```bash
ssh root@68.183.94.1 'grep -i "teams-artifacts" /var/log/ttii-lms/api.out.log | tail -20'
```

**3. Local protocol proof** (no prod creds needed) — runs the exact S3 code
against MinIO:
```bash
bash scripts/spaces-e2e.sh   # needs Docker
```

## Confirm with a real recording (the only thing left to see organically)

The storage half is proven; the Teams half just needs a recorded class:

1. In admin, create a **Teams** live session on a cohort and actually **Record**
   it in the Teams meeting for a minute, then end it.
2. Wait up to ~5 min for the cron (Teams also needs a few minutes to finish
   processing the recording).
3. Confirm: `live_class.recording_storage_key` + `recording_fetched_at` are set
   (and `recording_fetch_error` is NULL), an object appears under
   `recordings/YYYY/MM/<liveClassId>/…mp4` in the Space, and the student's past
   live class shows a **Watch Recording** action that plays.

If `recording_fetch_error` is populated, read it — it carries the exact Graph or
upload error.

---

## Reconfigure / rotate (reference)

All values come from the DigitalOcean control panel → **Spaces Object Storage**
+ **API → Spaces Keys** (account: `naji@teachersindia.in`). To change them, edit
`/opt/ttii-lms/.env` and `pm2 restart ttii-api`.

> **`S3_REGION` must equal the Space's datacenter slug** (`sgp1`), not an AWS
> region — it signs the SigV4 request. Mismatch → `SignatureDoesNotMatch`.

**Rollback:** set `STORAGE_PROVIDER=local` and `pm2 restart ttii-api`. New
recordings go to local disk; already-uploaded Spaces recordings keep playing.

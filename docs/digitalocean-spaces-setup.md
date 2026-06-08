# Enable DigitalOcean Spaces for live-class recordings

This is the cutover runbook to make Teams live-class recordings **auto-upload to
DigitalOcean Spaces** (TTII-owned storage) and replay to students.

> **"S3" = the protocol, not Amazon.** DigitalOcean Spaces speaks the S3 API, so
> the code provider is named `s3`. Setting `STORAGE_PROVIDER=s3` with the
> DigitalOcean endpoint below uses **DigitalOcean Spaces**, not Amazon AWS. No
> AWS account is involved.

---

## What's already built (no code change needed)

The full pipeline ships in the app; this is purely **configuration**:

- A cron (every 5 min) finds recently-ended Teams live classes, downloads the
  recording from Microsoft Graph, and **uploads it through the storage provider**
  (`apps/api/src/jobs/teams-artifacts-sync.ts`).
- When `STORAGE_PROVIDER=s3`, that provider is DigitalOcean Spaces
  (`apps/api/src/integrations/storage-provider.ts` → `S3StorageProvider`).
- The recording's storage key is saved on `live_class.recording_storage_key`.
- Students / instructors / admins play it via a **short-lived signed URL**
  (objects stay private — no public bucket needed):
  - `GET /api/student/live_classes/recording-url`
  - `GET /api/instructor/live-classes/:id/recording-url`
  - `GET /api/admin/live_classes/recording-signed-url`

Verified end-to-end against a real S3 server — see `scripts/spaces-e2e.sh`.

---

## Who does what

| Step | Who | Why |
|---|---|---|
| Create the Space + generate Spaces keys | **Naji** (owns the DigitalOcean account `naji@teachersindia.in`) | Requires account login; the secret key is shown only once |
| Put the keys into `/opt/ttii-lms/.env` + restart | **Vidit / ops** | Editing prod secrets on the droplet |
| Verify a recording lands + plays | Vidit / ops | Host a short Teams class with recording on |

Claude cannot create the Space, generate keys, or type secrets into the server —
those are account-owner / operator actions.

---

## Step 1 — Create the Space (Naji, ~2 min)

DigitalOcean control panel → **Spaces Object Storage** → **Create a Space**:

- **Region:** `Bangalore (blr1)` — same region as the LMS droplet (lowest latency).
- **Restrict File Listing:** **Enabled** (recordings are private; we serve signed URLs).
- **Name:** e.g. `ttii-recordings` (this becomes `S3_BUCKET`).
- **CDN:** optional. If you enable it, copy the edge URL for `S3_PUBLIC_BASE_URL`.

> Cost (blr1, pay-as-you-go): **$5/mo** includes 250 GB storage + 1 TB transfer;
> beyond that ~**$0.02/GB** storage and ~**$0.01/GB** transfer. A 1-hour Teams
> recording is roughly 0.4–1 GB.

## Step 2 — Generate Spaces access keys (Naji, ~1 min)

Control panel → **API** → **Spaces Keys** → **Generate New Key** → name it
`ttii-lms-recordings`.

- Copy the **Access Key** → `S3_ACCESS_KEY_ID`
- Copy the **Secret Key** (shown once!) → `S3_SECRET_ACCESS_KEY`

(CLI equivalent once `doctl` is authenticated: `doctl spaces keys create ttii-lms-recordings`.)

## Step 3 — Set env on the droplet (Vidit / ops)

SSH to the droplet and edit `/opt/ttii-lms/.env` (mode 600). Set:

```dotenv
STORAGE_PROVIDER=s3
S3_BUCKET=ttii-recordings
S3_REGION=blr1
S3_ENDPOINT=https://blr1.digitaloceanspaces.com
S3_ACCESS_KEY_ID=<access key from step 2>
S3_SECRET_ACCESS_KEY=<secret key from step 2>
S3_FORCE_PATH_STYLE=true
# Optional, only if you enabled the Spaces CDN in step 1:
# S3_PUBLIC_BASE_URL=https://ttii-recordings.blr1.cdn.digitaloceanspaces.com
```

> **`S3_REGION` must be the Space's datacenter slug** (`blr1`), not an AWS
> region — it is used for the SigV4 request signature. A mismatch yields
> `SignatureDoesNotMatch` / `AuthorizationHeaderMalformed` on upload.

Then restart the API:

```bash
pm2 restart ttii-api
pm2 logs ttii-api --lines 30   # expect: "Teams artifacts sync cron armed"
```

## Step 4 — Verify (Vidit / ops)

1. In admin, create a **Teams** live session on a cohort and **start + record** it
   for a minute (or use an already-recorded past session).
2. Wait up to ~5 min for the cron (recordings also take a few minutes to finish
   processing in Teams).
3. Confirm the recording landed:
   - **DB:** `recording_storage_key` and `recording_fetched_at` are set on that
     `live_class` row (and `recording_fetch_error` is NULL).
   - **Spaces:** the object appears under `recordings/YYYY/MM/<liveClassId>/…mp4`.
   - **Student:** the past live class shows a **Watch Recording** action that plays.

If `recording_fetch_error` is populated, read it — it carries the exact upload or
Graph error (e.g. a region/key mismatch).

---

## Rollback

Set `STORAGE_PROVIDER=local` (or unset the S3 keys) and `pm2 restart ttii-api`.
New recordings revert to local disk; already-uploaded Spaces recordings keep
playing as long as the keys remain valid.

## Re-run the end-to-end proof locally

```bash
bash scripts/spaces-e2e.sh   # needs Docker; spins up MinIO and runs the gated e2e tests
```

This exercises the exact upload → signed-URL → download code against a real
S3-compatible server (MinIO), which is protocol-identical to DigitalOcean Spaces.

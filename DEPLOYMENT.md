# TTII LMS — Deployment & Operations Runbook

This document is the source of truth for **how the production Node.js LMS runs
and how to deploy changes to it**. Any future Claude Code session or developer
working on this repo should read this first.

## TL;DR

- **Source of truth branch: `main`** — all production deployments come from here.
- **Push changes to `main`** (directly or via PR), then `git pull` on the droplet and rebuild.
- **Do NOT edit files directly on the droplet.** Always go through git.
- **Do NOT force-push `main` or rewrite history.**

> **Credentials:** SSH keys, DB passwords, DO API token, MS Graph secrets, and rotation instructions live in `DEPLOYMENT.local.md` at the repo root. That file is **gitignored** (see `.gitignore`) and must never be committed or shared. If `DEPLOYMENT.local.md` is missing on a fresh clone, fetch the live values from `/opt/ttii-lms/.env` on the production droplet via SSH — that file is the authoritative source.

---

## Production infrastructure

| What | Value |
|---|---|
| Provider | DigitalOcean |
| Droplet name | `ttii-nodejs-lms` |
| Droplet ID | `565131739` |
| Region | `blr1` (Bangalore) |
| Specs | `s-1vcpu-2gb`, Ubuntu 24.04, $12/mo |
| Public IP | `68.183.94.1` |
| Private IP (VPC) | `10.122.0.3` |
| SSH | `ssh root@68.183.94.1` |
| Code path | `/opt/ttii-lms` |
| Env file | `/opt/ttii-lms/.env` (mode 600, not in git) |
| Logs | `/var/log/ttii-lms/api.{out,err}.log`, `/var/log/nginx/ttii-lms.{access,error}.log` |

### Live URLs

- **https://admin.teachersindia.in** — admin portal (Super Admin, Admin, Counsellor)
- **https://learn.teachersindia.in** — student portal
- **https://admissions.teachersindia.in** — centre portal (Centre, Associate)

### Backing database

- **Existing MariaDB on `lms.teachersindia.in` droplet** (`143.110.240.210`)
- New droplet connects over VPC private network to `10.122.0.2:3306`
- Database: `lms_ttii`, user: `lms_ttii@10.122.0.3`
- **Same DB that the old PHP LMS (`lms.teachersindia.in`) uses** — both apps read/write concurrently. Avoid conflicting edits until the PHP app is retired.
- Schema: 121 legacy tables + 3 additive auth tables (`auth_session`, `password_reset_token`, `auth_audit_log`)

### SSL

- Let's Encrypt SAN certificate covering all 3 subdomains
- Auto-renewing via `certbot.timer` systemd unit (daily check)
- `/etc/letsencrypt/live/admin.teachersindia.in/` holds the keys

### Process management

- **PM2** runs the Fastify API as `ttii-api`
- Binds to `127.0.0.1:4000` only (NOT public — nginx proxies)
- Auto-start on reboot via `pm2-root.service` systemd unit
- Config: [`deploy/ecosystem.config.cjs`](deploy/ecosystem.config.cjs)
- Uses Node 24's native `--env-file=/opt/ttii-lms/.env`

### Reverse proxy

- **nginx** on ports 80 + 443
- Config: [`deploy/nginx-ttii.conf.template`](deploy/nginx-ttii.conf.template) (in repo, for reference)
- Live config: `/etc/nginx/sites-available/ttii-lms` on the droplet
- Subdomain → portal routing happens **client-side** in React (see [`apps/web/src/lib/subdomain.ts`](apps/web/src/lib/subdomain.ts)) — nginx serves the same SPA bundle to all 3 subdomains

---

## How to deploy changes

### Standard workflow (code changes)

```bash
# 1. Work locally on main
git checkout main
git pull origin main

# 2. Make your changes, commit
git add <files>
git commit -m "fix/feat/chore: short description"

# 3. Push to origin
git push origin main

# 4. Deploy: pull + rebuild on the droplet
ssh root@68.183.94.1
cd /opt/ttii-lms
git pull origin main
# Then run the appropriate rebuild step below, based on what changed.
```

### Rebuild step by scope of change

| What changed | Commands on droplet |
|---|---|
| **Frontend code only** (`apps/web/src/**`) | `VITE_API_BASE_URL="" VITE_BASE_DOMAIN="teachersindia.in" npm run build -w @ttii/web` |
| **Backend code only** (`apps/api/src/**`) | `npm run build -w @ttii/api && pm2 restart ttii-api` |
| **Prisma schema** (`apps/api/prisma/schema.prisma`) | `cd apps/api && npx prisma generate && cd ../.. && npm run build && pm2 restart ttii-api` |
| **Shared packages** (`packages/**`) | `npm run build && pm2 restart ttii-api` (rebuilds everything downstream) |
| **Dependencies** (`package.json` / lockfile) | `npm ci && npm run build && pm2 restart ttii-api` |
| **`.env` values** | Edit `/opt/ttii-lms/.env` directly; then `pm2 restart ttii-api --update-env` |
| **nginx config** | Edit `/etc/nginx/sites-available/ttii-lms`; `nginx -t && systemctl reload nginx` |
| **Just restart API** (e.g. memory leak suspicion) | `pm2 restart ttii-api` |

### If a build fails

1. Check the error output — common causes: missing env var, TypeScript error in new code, Prisma schema drift.
2. Fix locally, commit, push, pull again.
3. **Never leave the droplet in a half-built state.** If the build breaks and PM2 keeps running the old binary, that's OK — just fix forward quickly.

### Bigger changes — safer flow

For anything touching DB schema, auth, or multiple services:

```bash
git checkout main
git pull origin main
git checkout -b fix/my-change-name
# work, commit, push branch
git push origin fix/my-change-name
# Open PR on GitHub, self-review, merge to main
# Then deploy from main as above
```

---

## What NOT to do

1. **Don't edit files directly on the droplet.** Next `git pull` overwrites them or git refuses to pull (untracked file conflict).
2. **Don't commit `.env`** or any file with secrets. `.env` stays on the droplet only.
3. **Don't force-push `main`.** If you must rewrite history, do it on a feature branch first.
4. **Don't skip `prisma generate`** when the schema changes. `apps/api/package.json`'s build script chains it, but manual runs of just `tsc` will silently use stale Prisma types.
5. **Don't bind API to `0.0.0.0`** in `.env`. Keep `API_HOST=127.0.0.1`. nginx is the only thing that should face the internet.
6. **Don't touch the old PHP LMS** (`lms.teachersindia.in` → `143.110.240.210`) unless coordinating with Naji / Ansaba / Trogon. Both LMSes share the same MariaDB.
7. **Don't run `prisma db push` or `prisma migrate` against production.** Schema changes on production MariaDB are manual + reviewed. Use a plain SQL migration file instead.

---

## Common operations

### SSH in quickly
```bash
ssh root@68.183.94.1
```

### Check API status
```bash
ssh root@68.183.94.1 'pm2 list && tail -20 /var/log/ttii-lms/api.err.log'
```

### Watch API logs live
```bash
ssh root@68.183.94.1 'pm2 logs ttii-api --lines 50'
```

### Check nginx logs
```bash
ssh root@68.183.94.1 'tail -30 /var/log/nginx/ttii-lms.access.log'
ssh root@68.183.94.1 'tail -30 /var/log/nginx/ttii-lms.error.log'
```

### Check SSL cert expiry
```bash
echo | openssl s_client -servername admin.teachersindia.in -connect admin.teachersindia.in:443 2>/dev/null | openssl x509 -noout -dates
```

### Force SSL renewal (dry run first)
```bash
ssh root@68.183.94.1 'certbot renew --dry-run'
ssh root@68.183.94.1 'certbot renew'
```

### Manage DigitalOcean resources via `doctl`
```bash
# List droplets
doctl compute droplet list

# Reboot the LMS droplet
doctl compute droplet-action reboot 565131739 --wait

# SSH key management
doctl compute ssh-key list
```

### Access the live MariaDB (from new droplet, read/write)
```bash
ssh root@68.183.94.1 'mysql -h 10.122.0.2 -u lms_ttii -p lms_ttii'
# password: see /opt/ttii-lms/.env → MYSQL_PASSWORD
```

### Access MariaDB as root (from existing PHP droplet only)
```bash
ssh root@143.110.240.210 'PASS=$(cat /etc/cyberpanel/mysqlPassword); mysql -u root -p"$PASS" lms_ttii'
```

---

## Who controls what

| Thing | Who |
|---|---|
| Domain registration (`teachersindia.in`) | GoDaddy account — contact Naji for access |
| DNS records (A, MX, etc.) | **WebQ agency** (relay via Naji). Nameservers point to Hostinger's `dns-parking.com`, but records live with WebQ. |
| DigitalOcean account | Naji (`naji@teachersindia.in`) |
| SSH access to droplets | `root@68.183.94.1` (new) and `root@143.110.240.210` (old PHP, CyberPanel-managed) |
| Old PHP LMS code | Ansaba at Trogon (`project.trogon@gmail.com`) |
| Microsoft Graph email app | Azure AD tenant — credentials in `/opt/ttii-lms/.env` |
| GitHub repo | `https://github.com/viditkbhatnagar/ttii_migration` |

---

## Pending follow-ups (do when you can)

1. **Disable Render auto-deploy on `main`** — Render was running the old MongoDB-based app; `main` is now MySQL, so builds will fail. Safe to disable or delete the service.
2. **Decommission old PHP LMS** — `lms.teachersindia.in` on `143.110.240.210`. Currently runs alongside the new LMS. Coordinate retirement with Naji to avoid dual-write conflicts.
3. **Wire real Razorpay + Zoom keys** — currently mock/placeholder in `.env`.
4. **Weekly PHP session GC cron on existing droplet** — see [`deploy/README.md`](deploy/README.md) under "Post-deploy follow-ups". Stops the stale-session bloat that hit 6.7 GB in April 2026.
5. **Logrotate for `/home/lms.teachersindia.in/apps/writable/logs/`** — also in `deploy/README.md`.
6. **`journald` size cap** on existing droplet — set `SystemMaxUse=500M` in `/etc/systemd/journald.conf`.
7. **Rotate DO API token** — current one expires 2026-05-15. Create a permanent restricted-scope token for ongoing ops.
8. **Subdomain-aware role dropdown** — login page still shows all 8 roles regardless of which subdomain the user lands on. Filter the dropdown per subdomain (admin. → admin-ish roles only, learn. → Student only, admissions. → Centre + Associate only).

---

## First-time setup on a new machine (for a new dev)

```bash
git clone https://github.com/viditkbhatnagar/ttii_migration.git
cd ttii_migration
git checkout main
cp .env.example .env           # edit values for local dev
npm ci
cd apps/api && npx prisma generate && cd ../..
npm run dev                     # starts API on 4000 + Web on 5173
```

Local dev uses a Docker MariaDB on port 3307 (see [CLAUDE.md](CLAUDE.md) for details).

---

## If something breaks

1. **Check PM2 first:** `ssh root@68.183.94.1 'pm2 list'` — if `ttii-api` is `errored` or restarting, look at `/var/log/ttii-lms/api.err.log`.
2. **Check nginx:** `systemctl status nginx` → `systemctl reload nginx` if it's in a weird state.
3. **Check DB connectivity:** `ssh root@68.183.94.1 'mysql -h 10.122.0.2 -u lms_ttii -p"$MYSQL_PASSWORD" -e "SELECT 1"'` — if this fails, the VPC link or MariaDB `bind-address` has regressed.
4. **Check disk space:** `ssh root@68.183.94.1 'df -h /'` — the new droplet has 48 GB, plenty of headroom.
5. **Worst case rollback:** `cd /opt/ttii-lms && git log --oneline -10` → `git checkout <previous-good-commit>` → `npm run build && pm2 restart ttii-api`. Then figure out what went wrong on your Mac, not on the droplet.

---

*Last updated: 2026-04-16 by the deploy session (session 08 of the MongoDB→MySQL migration). If this document drifts from reality, fix it in a PR — this file is the runbook.*

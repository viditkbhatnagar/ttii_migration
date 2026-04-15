# TTII LMS — Production Deploy Assets

Staged files for Session 08 (DigitalOcean deploy). Nothing here is auto-executed; each is referenced by a manual step.

| File | Used in | Step |
|------|---------|------|
| `auth-tables.sql` | Existing droplet, `lms_ttii` DB | §3 — add 3 additive auth tables |
| `mariadb-grant-new-droplet.sql.template` | Existing droplet, `mysql.user` | §4 — grant new droplet's private IP |
| `.env.production.template` | New droplet `/opt/ttii-lms/.env` | §5 — runtime env |
| `nginx-ttii.conf.template` | New droplet `/etc/nginx/sites-available/ttii-lms` | §6 — reverse proxy |
| `ecosystem.config.cjs` | New droplet `/opt/ttii-lms/` | §5 — PM2 process manager |

## Order of operations (gated)
1. **Disk audit** on existing droplet — non-destructive.
2. **Create droplet** `ttii-nodejs-lms` (2GB, blr1, VPC) — costs $12/mo.
3. **Install runtime** — apt + node 24 + nginx + pm2.
4. **Apply `auth-tables.sql`** on existing droplet (additive only).
5. **Note new droplet's private VPC IP**, fill `<NEW_DROPLET_PRIVATE_IP>` in `mariadb-grant-new-droplet.sql.template`, run on existing droplet. Restart MariaDB.
6. **Clone repo** at `https://github.com/viditkbhatnagar/ttii_migration.git`, branch `mysql-migration`. `npm ci && npm run build`.
7. **Fill `.env.production.template`** → `/opt/ttii-lms/.env`.
8. **Start PM2** with `ecosystem.config.cjs`. Verify via `localhost:4000/api/health`.
9. **Install nginx config** + Certbot SSL (after DNS or via temporary self-signed for smoke test).
10. **Smoke test** via temporary URL or IP (do NOT cut DNS yet).
11. **DNS cutover** — only after explicit user approval, per subdomain.
12. **Merge `mysql-migration` → `main`** — only after smoke test passes end-to-end.

## Generating secrets
```
openssl rand -hex 32   # for PASSWORD_RESET_TOKEN_KEY, OTP_SIGNING_KEY, STORAGE_LOCAL_SIGNING_KEY
```

## Notes
- DDL grants intentionally not given to the app user. Any future schema migration runs as root via reviewed scripts.
- Existing PHP LMS at `lms.teachersindia.in` is untouched. Only additive tables and one new MySQL user are added in production.
- Existing droplet disk was 95% full per memory — cleaned to 61% on 2026-04-15 (session GC not running; 1.46M stale sessions removed).

## Post-deploy follow-ups
**Apply AFTER new LMS is verified working end-to-end. Do not run before.**

1. **Weekly PHP session GC on existing droplet** — root cause of the 6.7 GB bloat. Add to `/etc/cron.weekly/ttii-session-gc`:
   ```bash
   #!/bin/bash
   # Purge PHP session files older than 7 days from the CI LMS writable/session dir.
   ionice -c 3 nice -n 19 find /home/lms.teachersindia.in/apps/writable/session -type f -mtime +7 -delete
   ```
   Then `chmod +x /etc/cron.weekly/ttii-session-gc`.
2. **Logrotate for writable/logs** on existing droplet — drop anything >30d:
   ```
   /home/lms.teachersindia.in/apps/writable/logs/log-*.log {
       daily
       missingok
       rotate 30
       compress
       delaycompress
       notifempty
       create 0644 lmste1531 lmste1531
   }
   ```
   Drop in `/etc/logrotate.d/ttii-ci-logs`.
3. **Enable /etc/logrotate on /var/log** — verify `journald` `SystemMaxUse=500M` in `/etc/systemd/journald.conf` so journal doesn't balloon back to 1.9 GB.

# Session 08: Deploy to DigitalOcean, connect to live MySQL

## Context
Migration is complete, app runs locally against a mirrored MySQL schema. This session provisions the production deployment.

**Prerequisites:** Sessions 01–07 completed. `npm run build` passes at repo root. App runs locally against local MariaDB.

## Before you start
1. Read memory files: all three — especially `digitalocean-production.md`
2. User must be available to approve actions on the DO account
3. Ask the user explicitly before:
   - Creating a new droplet (costs money, ~$6/mo)
   - Running SQL on the production MariaDB
   - Pushing to main or deploying

## The task

### Step 1 — Provision new droplet
Create a new DO droplet for Node.js:
- Ubuntu 24.04 LTS
- Basic plan, 1GB or 2GB RAM (recommend 2GB at ~$12/mo for headroom)
- Same region as existing: **blr1 (Bangalore)**
- Enable VPC networking (same VPC as existing droplet `cyberpanel236onubuntu2204-s-1vcpu-1gb-blr1-01`)
- Add SSH key or set root password

### Step 2 — Install runtime on new droplet
On the new droplet (SSH in):
```
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_24.x | bash
apt install -y nodejs git nginx
npm install -g pm2
```

### Step 3 — Add auth tables to production MariaDB
These 3 additive tables must exist before the new app runs. SSH into the **existing** droplet (`143.110.240.210`) and run:
```sql
USE lms_ttii;

CREATE TABLE IF NOT EXISTS auth_session (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoked_reason VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  INDEX (user_id, revoked_at),
  INDEX (expires_at)
);

CREATE TABLE IF NOT EXISTS password_reset_token (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  requested_ip VARCHAR(64) NULL,
  requested_user_agent VARCHAR(500) NULL,
  INDEX (user_id, used_at),
  INDEX (expires_at)
);

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  event VARCHAR(100) NOT NULL,
  identifier VARCHAR(255) NULL,
  success INT DEFAULT 0,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  details TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (event, created_at),
  INDEX (user_id),
  INDEX (created_at)
);
```
Ask user to approve this SQL before running — it modifies production.

### Step 4 — Allow new droplet to connect to existing MariaDB
On the **existing** droplet, edit `/etc/mysql/mariadb.conf.d/50-server.cnf` or similar to bind to the private VPC IP (not 0.0.0.0). Then create a MariaDB user for the new droplet's private IP:
```sql
CREATE USER 'lms_ttii'@'<new_droplet_private_ip>' IDENTIFIED BY 'rsxH9#lB3-D-uEti';
GRANT SELECT, INSERT, UPDATE, DELETE ON lms_ttii.* TO 'lms_ttii'@'<new_droplet_private_ip>';
FLUSH PRIVILEGES;
```
Restart MariaDB.

### Step 5 — Clone app on new droplet, build, run via PM2
```
cd /opt
git clone https://github.com/viditkbhatnagar/ttii_migration.git ttii-lms
cd ttii-lms
git checkout mysql-migration  # or main, once merged
npm ci
npm run build
```
Create `/opt/ttii-lms/.env` with production values. Then:
```
pm2 start apps/api/dist/index.js --name ttii-api
pm2 save
pm2 startup
```

### Step 6 — Nginx reverse proxy + SSL
Configure nginx on new droplet:
- `<new_subdomain>.teachersindia.in` → `localhost:4000` (API)
- Serve `apps/web/dist/` static files
- Get SSL via Certbot

### Step 7 — DNS
Ask user to add DNS records pointing the new subdomains to the new droplet's public IP. Decisions: one domain or three (admin/learn/admissions)?

## Definition of done
- New LMS reachable via browser
- Login works against live production data
- Existing PHP LMS at `lms.teachersindia.in` unaffected
- PM2 set to auto-start on reboot
- Merge `mysql-migration` into `main` (only after user approval)
- Update `migration-sessions/README.md` — mark all sessions ✅

## Do not without explicit user approval
- Create new droplets (costs money)
- Modify production MariaDB
- Point DNS at new server
- Merge to main
- Push force or delete anything

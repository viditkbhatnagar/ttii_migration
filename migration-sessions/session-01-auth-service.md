# Session 01: Fix auth-service.ts (MySQL migration)

## Context
I'm in the middle of migrating the TTII LMS from MongoDB to MySQL. Baseline work is done on the `mysql-migration` branch. Now I need to fix the first service file: `apps/api/src/auth/auth-service.ts`.

## Before you start
1. Read memory files — they have full context:
   - `mysql-migration-status.md`
   - `mysql-field-mappings.md`
   - `digitalocean-production.md`
2. Verify you're on the right branch:
   ```
   git branch --show-current  # should be mysql-migration
   ```
3. Verify local MariaDB is running:
   ```
   docker ps | grep ttii-mysql  # should show port 3307
   ```
   If not running: `docker start ttii-mysql`
4. Confirm `.env` has `DATABASE_URL=mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii`

## The task
Fix ~49 TypeScript errors in `apps/api/src/auth/auth-service.ts` caused by:
1. `user.id` is now `Int`, not `String` (MySQL autoincrement vs Mongo ObjectId)
2. Some user fields MongoDB had don't exist in MySQL (`deleted_at`, `user_id`, `user_designation_id`, `profile_picture`, `created_at`, `updated_at`, etc.)
3. Some user fields are required NOT NULL in MySQL where they were nullable in Mongo (`gender`)

## Approach (apply this pattern consistently)
- **Boundary conversion for IDs:** Keep the external contract (JWT payloads, session tokens, API responses) using strings. Convert to Int only at Prisma query boundaries.
  ```ts
  // Reading: Int from DB → String to caller
  const user = await db.users.findUnique({ where: { id: parseInt(userIdString, 10) } });
  return user ? { ...user, id: String(user.id) } : null;

  // Writing: String from caller → Int to DB
  await db.auth_session.create({ data: { user_id: parseInt(userIdString, 10), ... } });
  ```
- **Remove references to non-existent fields** (`deleted_at` filters, `user_id` lookups, `user_designation_id`). If a method depended on these, either rewrite it using existing MySQL columns or add a TODO and throw a clear error.
- **Nullable handling:** Where MongoDB had `String?` and MySQL has `String` NOT NULL, code that passed `null` must now supply a value or be restructured.

## How to verify progress
```
cd apps/api
DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep "src/auth/auth-service.ts" | wc -l
```
Should reach 0.

## Definition of done
- `auth-service.ts` has 0 TypeScript errors
- Related route handlers in `apps/api/src/routes/auth.ts` compile (may need small fixes there too)
- Existing auth logic (login, logout, forgot password OTP flow, signed reset tokens) is preserved — do not remove features, just adjust to new types
- Commit with message `fix(mysql-migration): auth-service types and ID boundaries`
- Update `migration-sessions/README.md` status to ✅ Completed for session 01

## Not in scope
- Do not touch other service files
- Do not push anything to production MariaDB
- Do not merge `mysql-migration` to `main`

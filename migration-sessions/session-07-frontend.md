# Session 07: Migrate frontend to match MySQL API

## Context
Backend migration is done (Sessions 01–06). Now update the frontend to match the new API shapes.

**Prerequisites:** Sessions 01–06 completed. `@ttii/api` builds cleanly.

## Before you start
1. Read memory files: `mysql-migration-status.md`, `mysql-field-mappings.md`
2. Verify state: on `mysql-migration` branch
3. Get baseline:
   ```
   cd /Users/viditkbhatnagar/codes/ttii_app
   npm run typecheck -w apps/web 2>&1 | grep -c "error TS"
   ```

## The task
Update frontend code to handle:
- IDs as strings (they still come as strings from API — backend does the Int/String boundary conversion)
- Removed fields: `profile_picture`, `address_line_1`, `city`, `state`, `pincode`, `created_at`, `updated_at`, `deleted_at` on users — remove UI elements or replace with new fields
- Renamed fields: `dob` instead of `date_of_birth`, `place` instead of address fields, `pin_code` instead of `pincode`

### Files most affected
- `apps/web/src/admin/admin-portal-api.ts` — API client types
- `apps/web/src/student/student-portal-api.ts`
- `apps/web/src/centre/centre-portal-api.ts`
- `apps/web/src/admin/pages/**/*.tsx` — ~80 admin pages, many reference user fields
- Student portal pages that display profile, DOB, address
- Centre portal pages similarly

### Approach
1. Start with the API client files — fix types there first. That cascades type errors to pages.
2. Work through pages in batches by domain (user pages, centre pages, cohort pages, etc.)
3. For each page, either:
   - Rename field references (e.g. `user.date_of_birth` → `user.dob`)
   - Remove UI sections showing fields that no longer exist
   - Replace with available fields where semantically close

### Optional: keep the frontend unchanged via API adapter
If preferred, you can keep the frontend's field names stable by doing the renaming in the backend route responses:
```ts
// in route handler
return reply.send({ ...user, date_of_birth: user.dob, pincode: user.pin_code, address_line_1: user.place });
```
This is a valid shortcut to preserve frontend code — discuss with user which approach they want.

## Progress check
```
cd /Users/viditkbhatnagar/codes/ttii_app
npm run typecheck -w apps/web 2>&1 | grep -c "error TS"
```
Target: 0.

Then verify full build:
```
npm run build
```
All workspaces should build.

## Definition of done
- `apps/web` type-checks and builds
- App starts locally: `npm run dev` — login page loads
- Commit: `fix(mysql-migration): frontend API types and pages`
- Update `migration-sessions/README.md`

## Not in scope
- Deployment (Session 08)

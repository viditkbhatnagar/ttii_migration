# Session 06: Fix commerce service, all routes, and backend tests

## Context
Close out the backend migration:
- `apps/api/src/commerce/commerce-service.ts` (~46 errors)
- All files in `apps/api/src/routes/` that still have errors
- All backend test files in `apps/api/tests/`

**Prerequisites:** Sessions 01–05 completed.

## Before you start
1. Read memory files: `mysql-migration-status.md`, `mysql-field-mappings.md`
2. Verify state: on `mysql-migration` branch, local MariaDB running
3. Take stock:
   ```
   cd apps/api
   DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep -c "error TS"
   ```
   At this point the backend should be close to zero errors — if you see anything outside commerce/routes/tests, fix it first.

## The task

### 1. commerce-service.ts
Apply patterns. Key tables: `orders` (if exists), `payments`, `fee_installments`, `fee_receipts`, `coupon_code`, `coupon_code_new`, `centre_fund_requests`, `wallet`, `wallet_transactions`.

### 2. Routes layer
All files in `apps/api/src/routes/`. Common issues:
- Zod schemas still expecting string IDs — change to `z.coerce.number()` or keep as string and coerce in service
- Route params are strings — convert at boundary before calling service
- Response shapes may need `id: String(user.id)` coercion

### 3. Backend tests
All files in `apps/api/tests/`. Common failures:
- Fixtures using MongoDB ObjectId strings — replace with integer fixtures
- Test data setup assuming `deleted_at` or other removed fields — clean up
- Tests that did `prisma.users.create` with old shape — update to new shape

Some tests may be obsolete (testing features that don't match production MySQL reality). For those, add `.skip` with a `// TODO: re-enable after migration` comment rather than deleting.

## Progress check
```
cd apps/api
DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep -c "error TS"
```
Target: 0.

Then run:
```
cd /Users/viditkbhatnagar/codes/ttii_app
npm run lint -w @ttii/api
npm run build -w @ttii/api
```
Both should pass.

## Definition of done
- `@ttii/api` builds cleanly
- Commit: `fix(mysql-migration): commerce service, routes, and backend tests`
- Update `migration-sessions/README.md` — after this session backend is fully migrated

## Not in scope
- Frontend (Session 07)
- Deployment (Session 08)

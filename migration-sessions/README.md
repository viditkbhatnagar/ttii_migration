# MySQL Migration Sessions

This directory contains **superprompts** you paste as the first message when starting a fresh Claude Code chat to continue the MongoDB → MySQL migration.

## Why sessions?
The migration has ~1,200+ TypeScript errors to fix. A single chat can't do it all — context gets exhausted. Each session below tackles one domain (one service file) so the model has fresh context.

## How to use

1. Open a fresh Claude Code chat in this project
2. Pick the next pending session below
3. Copy the ENTIRE contents of that session's `.md` file
4. Paste as the first message
5. The agent will read its own memory, the superprompt, and get to work
6. When done, it should commit on `mysql-migration` branch and mark the session complete in this README

## Sessions

| # | File | Goal | Status |
|---|------|------|--------|
| 01 | [session-01-auth-service.md](session-01-auth-service.md) | Fix `apps/api/src/auth/auth-service.ts` (~49 errors) | ✅ Completed |
| 02 | [session-02-operations-service-part1.md](session-02-operations-service-part1.md) | First half of operations-service.ts | ✅ Completed |
| 03 | [session-03-operations-service-part2.md](session-03-operations-service-part2.md) | Second half of operations-service.ts | ✅ Completed |
| 04 | [session-04-content-services.md](session-04-content-services.md) | content-service + asset + offering + program + certificate | ✅ Completed |
| 05 | [session-05-assessment-engagement.md](session-05-assessment-engagement.md) | assessment-service + engagement-service | ✅ Completed |
| 06 | [session-06-commerce-routes-tests.md](session-06-commerce-routes-tests.md) | commerce-service + routes + backend tests | ✅ Completed — backend fully migrated |
| 07 | [session-07-frontend.md](session-07-frontend.md) | Frontend API types + admin/student/centre pages | ✅ Completed — backend adapter approach (old field names preserved), frontend typechecks and builds; dev server boots, web + api respond 200 |
| 08 | [session-08-deploy-digitalocean.md](session-08-deploy-digitalocean.md) | Provision droplet, deploy Node.js, connect to live MySQL | ✅ Completed 2026-04-16 — live at https://admin.teachersindia.in / learn. / admissions. (Let's Encrypt SSL, auto-renewing) |
| 09 | — (ad-hoc session, no superprompt) | CI hardening — zero lint errors, unit tests green, auto-deploy stable | ✅ Completed 2026-04-16 |
| 10 | — (ad-hoc session, no superprompt) | Correction2.docx Phases A/B/C/E — double-`+` fix, Course Directory + Subjects field expansion, Enrollments filters, View Student placeholders, Cohort Assignments col | ✅ Completed 2026-04-18 |
| 11 | [session-11-admin-qa-round2-remainder.md](session-11-admin-qa-round2-remainder.md) | Correction2.docx Phases F/G/H/I/J — Programs enhancement, Cohorts Language+Offerings, Offering Access/Rules, Content Library + Quiz subsystem, View Student data wiring | ✅ Completed 2026-04-18 — scope widened: superprompt assumed tables existed but offerings/completion_policies/certificate_templates/content_asset/quiz_question/cohort_offerings were all missing. Created all 6 tables from scratch + replaced Program/Offering/CompletionPolicy/CertificateTemplate/ContentAsset stubs with real CRUD. Phase J uses empty-state cards for certificates/email/whatsapp (tables deferred) |

## When a session is done
Update the status column above. Commit the change. Then the next session will pick up cleanly.

## Safety rules for all sessions
- All work on the `mysql-migration` branch — never merge to `main` without explicit approval
- Never run `prisma db push` or migrations against the **production** MariaDB (`143.110.240.210`)
- Local MariaDB (Docker, port 3307) is the only place to test schema-changing operations
- Read the memory files first: `mysql-migration-status.md`, `mysql-field-mappings.md`, `digitalocean-production.md`

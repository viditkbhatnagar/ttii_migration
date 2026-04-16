# Session 05: Fix assessment + engagement services

## Context
Fix two related service files:
- `apps/api/src/assessment/assessment-service.ts` (~88 errors)
- `apps/api/src/engagement/engagement-service.ts` (~73 errors)

Total target: ~161 errors resolved.

**Prerequisites:** Sessions 01–04 completed.

## Before you start
1. Read memory files: `mysql-migration-status.md`, `mysql-field-mappings.md`
2. Verify state: on `mysql-migration` branch, local MariaDB running

## The task
Apply established patterns.

### Assessment tables
- `assignment`, `assignment_submissions`, `assignment_reminders`
- `entrance_exam`, `entrance_exam_questions`, `entrance_exam_submissions`
- `re_exam`, `exam_evaluation`
- `question_bank`, `question_bank_categories`
- `quiz` (if exists)

Note: enum `assignment_reminders_reminder_type` uses `day_1`, `day_2`, etc. (see memory — renamed from `1day`/`2day`).

### Engagement tables
- `notifications`, `notification_read`
- `chat`, `chat_message`, `support_chat`
- `announcements`, `banners`, `circulars`
- `events`, `calendar`
- `feedback`, `user_feedbacks`, `contact_form`
- `mentorship`, `mentorship_session`

## Progress check
```
cd apps/api
DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep -E "assessment-service|engagement-service" | wc -l
```
Target: 0.

## Definition of done
- Both files type-check
- Commit: `fix(mysql-migration): assessment and engagement services`
- Update `migration-sessions/README.md`

## Not in scope
- Routes
- Frontend

# Phase 01 Handoff

## Summary
- phase: 01
- status: completed
- date: 2026-02-22

## Completed
1. Replaced placeholder parity matrix with full Phase 01 parity contract inventory.
2. Mapped legacy feature surface across public web, API, student web app, centre portal, and admin portal.
3. Tagged priorities for migration planning (`P0`/`P1`/`P2`) per major feature area.
4. Captured per-feature contract fields in `PARITY_MATRIX.csv`:
   - auth mode
   - input contract
   - output contract
   - side effects
   - primary data entities
5. Defined first OpenAPI draft surface (v0) aligned to current legacy behavior for `/api/*` endpoints.
6. Marked Phase 01 as completed in `PHASE_STATUS.yaml`.

## Parity Matrix Coverage
- total mapped feature rows: 106
- priority split:
  - `P0`: 51
  - `P1`: 48
  - `P2`: 7
- domain split:
  - admin: 33
  - api-learning: 9
  - api-engagement: 7
  - app-student: 11
  - centre: 9
  - public/auth/shared/integration/utility/cross-cutting: 28 total

## OpenAPI Draft Surface (v0)
Base path assumption: `/api`

Security model captured from legacy:
- public endpoints: `GET /api/login/index`, `GET /api/login/register`, `GET /api/login/verify_otp`, `GET /api/category/index`
- all other endpoints: `auth_token` required (`GET` query param or `POST` form param)

### Auth
- `GET /api/login/index` -> phone+password login
- `GET /api/login/register` -> register by phone
- `GET /api/login/verify_otp` -> verify OTP
- `GET /api/login/source_list` -> source lookup
- `GET /api/login/update_source` -> persist source
- `GET /api/login/resend_otp` -> resend OTP
- `POST /api/login/forgot_password` -> reset mail trigger

### Home and Notifications
- `GET /api/home/index` -> student dashboard aggregate
- `GET /api/home/view_all_shorts` -> short videos
- `GET /api/home/get_notification`
- `GET /api/home/get_notification_list`
- `GET /api/home/mark_notification_as_read`
- `GET /api/home/save_notification_token`

### Catalog and Learning
- `GET /api/category/index`
- `GET /api/category/get_category_details`
- `GET /api/course/all_course`
- `GET /api/course/get_course_details`
- `GET /api/course/enrol_course`
- `GET /api/course/my_course`
- `GET /api/course/get_subjects`
- `GET /api/course/get_lessons`
- `GET /api/course/my_learning`
- `GET /api/course/my_course_details`
- `GET /api/course/enrolled_courses`
- `GET /api/course/switch_course`
- `GET /api/lesson/index`
- `GET /api/lesson_file/index`
- `GET /api/lesson_file/videos`
- `GET /api/lesson_file/materials`
- `GET /api/lesson_file/save_video_progress`
- `GET /api/lesson_file/save_material_progress`
- `GET /api/lesson_file/streak_data`
- `POST /api/lesson_file/submit_report`

### Assessment
- `GET /api/assignment/index`
- `GET /api/assignment/get_assignment_details`
- `POST /api/assignment/submit_assignment`
- `GET /api/assignment/save_assignment`
- `GET /api/exams/index`
- `GET /api/exams/exam_calendar`

### Live
- `GET /api/live_class/index`
- `GET /api/live_class/live_classes_all`
- `GET /api/live_class/all_live_class`
- `GET /api/live_class/get_liveclass`
- `GET /api/live_class/generate_jwt_token`

### Commerce
- `GET /api/packages/index`
- `GET /api/payment/generate_payment`
- `GET /api/payment/create_order`
- `GET /api/payment/complete_order`
- `GET /api/payment/apply_coupon`
- `GET /api/payment/get_student_courses`
- `GET /api/payment/get_payment_details`

### Profile and Engagement
- `GET /api/profile/index`
- `POST /api/profile/update`
- `POST /api/profile/update_user_image`
- `POST /api/profile/change_password`
- `GET /api/events/index`
- `GET /api/events/get_event_details`
- `POST /api/events/register_event`
- `GET /api/events/add_feedback`
- `GET /api/feed/index`
- `GET /api/feed/feed_watched`
- `GET /api/feed/feed_like`
- `GET /api/feed/add_feed_comment`
- `GET /api/feed/feed_comments`
- `GET /api/review/add_review`
- `GET /api/review/get_user_review`
- `GET /api/review/like_review`
- `GET /api/user/wellness_categories`
- `GET /api/user/add_wellness_rating`
- `GET /api/user_goals/habit_catogories`
- `GET /api/user_goals/my_goals`
- `GET /api/user_goals/create_goal`
- `GET /api/user_goals/update_goal`
- `GET /api/user_goals/delete_goal`
- `GET /api/user_goals/goal_details`
- `GET /api/user_goals/mark_my_goal`
- `GET /api/user_goals/mark_goal_bulk`
- `GET /api/my_task/index`
- `GET /api/ai_features/ai_chat_messages`
- `POST /api/ai_features/ai_send_message`

## Unknowns Requiring SME Input
1. Centre auth hardening: `CentreBaseController` does not enforce `check_login()`; confirm if route-level middleware is expected for `/centre/*`.
2. Admin RBAC depth: many admin controllers require login but do not consistently enforce role-specific authorization; confirm intended role matrix per module.
3. Payment provider parity: both Easebuzz URL generation and Razorpay order completion exist; confirm production source of truth and expected fallback behavior.
4. JWT expiry contract: helper sets `exp = iat + 3600000` seconds; confirm intended token TTL.
5. HTTP verb compatibility: multiple mutating endpoints use `GET`; confirm if migration must preserve this exactly for client compatibility.
6. Legacy duplicate controllers (`*_old.php`, `copy.php`) remain auto-routable with `autoRoute=true`; confirm which are still business-active.
7. Scholarship module appears present but non-implemented; confirm active/deprecated status.
8. API response shape consistency: `status` field type varies (int/bool/string); confirm normalization plan and compatibility boundary.

## Files Changed
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-01.md`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/phase-01.md`

## Stop Rule Confirmation
- Phase 01 artifacts are complete.
- Phase 02 implementation work was not started.

## Next Phase Setup Instructions
1. Use this parity matrix as the source of truth to seed Phase 02 monorepo scaffolding and service boundary layout.
2. Convert OpenAPI draft v0 into machine-readable spec files (split by tags: auth, learning, assessment, live, commerce, engagement).
3. Resolve SME unknowns before freezing P0 API contracts.
4. Keep `autoRoute` behavior and GET-mutation quirks documented as explicit compatibility requirements for first-pass Node parity.

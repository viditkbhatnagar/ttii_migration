# EduPulse Design Reference (ttii.lovable.app)

> Captured 2026-06-04 by walking every page of the EduPulse Lovable prototype.
> Purpose: source-of-truth spec for porting EduPulse's **layout** onto **TTII brand tokens**
> ("his layout, our brand") into the student portal — continuing the port already begun
> (Dashboard, Live Classes, Exams).
>
> Live reference: https://ttii.lovable.app — note it is a logged-in **student** demo
> (user "Aarav Sharma", B.Ed Batch 2025). Stack: React SPA, shadcn/ui + Tailwind, Plus Jakarta Sans.

---

## 1. Design System / Tokens

Pulled from the live `:root` CSS variables (shadcn/Tailwind token set).

| Token | EduPulse value | TTII brand equivalent (use when porting) |
|---|---|---|
| Font family | **Plus Jakarta Sans**, Inter, system | **Poppins** (TTII standard) |
| `--primary` | `#8047e1` (blue-purple) | `#8F2774` (TTII magenta) |
| `--primary-foreground` | `#fcfcfc` | `#fcfcfc` |
| `--primary-soft` | `#f2efff` | tint of `#8F2774` (~`#F7EAF3`) |
| `--background` (page) | `#fafafd` | `#F3F6F9` (TTII page bg) |
| `--card` | `#ffffff` | `#ffffff` |
| `--card-foreground` / `--foreground` | `#100f22` | `#100f22` / near-black |
| `--muted` | `#f3f2fa` | light neutral |
| `--muted-foreground` | `#616174` | `#616174` |
| `--secondary` | `#f1f0fc` | tint of brand |
| `--accent` / `--accent-foreground` | `#efebff` / `#431f7e` | brand tint / `#5A1A49` |
| `--border` / `--input` | `#e4e3ec` | `#e4e3ec` |
| `--ring` | `#8047e1` | `#8F2774` |
| `--destructive` | `#e62b34` | keep |
| `--success` | `#20b46b` | keep |
| `--warning` | `#f2a618` | keep |
| `--info` | `#009bd8` | keep |
| `--radius` | `0.875rem` (14px) | adopt 14px |
| Chart palette | `#8047e1 #ce74e3 #009bd8 #f2a618 #20b46b` | re-anchor chart-1 to `#8F2774` |
| Sidebar bg / active | `#fff` / accent `#f2efff`, primary `#8047e1` | white / brand tint / `#8F2774` (or existing `rgb(27,97,197)` active) |

**Key port rule:** swap EduPulse blue-purple `#8047e1` → TTII magenta `#8F2774` everywhere
(primary, ring, sidebar-active, chart-1, gradient anchors), swap Plus Jakarta Sans → Poppins,
swap page bg `#fafafd` → `#F3F6F9`. Keep semantic success/warning/info/destructive as-is.

### Recurring visual motifs
- **Rounded everything** — 14px radius on cards, inputs, buttons, badges.
- **Gradient banners** — course/certificate/payment cards use diagonal gradients in 3 hues
  (purple `#8047e1→`, pink/magenta `#ce74e3→`, blue `#009bd8/indigo→`). On port these become
  TTII magenta/secondary-orange (`#F06543`) family.
- **Soft tinted icon tiles** — small rounded-square icon chips behind each stat/list icon, tinted
  to the semantic color (purple/green/amber/blue/red).
- **Pill badges** — status chips with soft bg + colored text (e.g. green "Verified", amber "Due Today",
  blue "Awaiting review", red "Overdue", purple "Primary").
- **Stat tiles** — number-forward cards: big value, label, tiny delta subtext ("+2 this term").
- Generous whitespace, clear scale contrast (big headings ~36px, body ~15–16px).

---

## 2. Global Shell

**Left sidebar (fixed, white):**
- Brand: gradient square logo "EduPulse" + "Student Portal".
- Section group **LEARNING**: Dashboard, Courses, Live Classes, Assignments, Exams, Grades.
- Section group **ACCOUNT**: Payments, Certificates, Calendar.
- Footer: Logout.
- Active item = filled brand background, white text, rounded.

**Top header (sticky):** sidebar toggle · global search ("Search courses, classes, lessons…") ·
messages icon (chat bubble) · notifications bell (red unread dot → `/notifications`) ·
profile chip (avatar + name + "Batch 2025 · B.Ed"). Profile chip opens **My Account** dropdown:
Profile, Certificates, Billing, Sign out.

---

## 3. Page Inventory (routes)

| # | Page | Route | Ported? |
|---|---|---|---|
| 1 | Dashboard | `/` | ✅ (commit 5a5a0e89) |
| 2 | My Courses (list) | `/courses` | ⬜ |
| 3 | My Course detail (subjects) | `/my-course/:slug` | ⬜ |
| 4 | Lesson Player | `/learn` | ⬜ (partial — native quiz/exam players exist) |
| 5 | Live Classes | `/live` | ✅ (commit 05974c21) |
| 6 | Assignments | `/assignments` | ⬜ |
| 7 | Exams | `/exams` | ✅ (commit 66a30e88) |
| 8 | Grades | `/grades` | ⬜ |
| 9 | Payments & Billing | `/payments` | ⬜ |
| 10 | Certificates | `/certificates` | ⬜ |
| 11 | Calendar | `/calendar` | ⬜ |
| 12 | Notifications | `/notifications` | ⬜ |
| 13 | Settings (Profile + Security) | `/settings` | ⬜ |
| 14 | Course Landing / Sales | `/course/:slug` | ⬜ |

> Ported flags are from session memory — verify against current `apps/web/src/student/` before relying on them.

---

## 4. Per-Page Breakdown

### 1. Dashboard (`/`)
- Welcome hero: "Welcome back, {name} 👋" + subtitle + **Resume Learning** button.
- **5 stat cards** (icon tile + big value + label + delta): Enrolled Courses (8, +2 this term),
  Upcoming Classes (12, Next in 2h 15m), Pending Assignments (4, 2 due this week),
  Payment Due (₹99,900, Due by 15 Jun), Certificates (5, 1 ready to claim).
- **Continue Learning** — 3 gradient course cards: progress % badge, title, instructor, module,
  progress bar, Resume button. "View all" link.
- **Achievements & Badges** — "8 Earned" pill + grid of circular-gradient badge cards
  (Learning Streak, Fast Learner, Quiz Master, Assignment Champ, Top Performer, Course Completer) w/ subtitle + timeago.
- **Recent Activity** — timeline list (circular type icon + text + timeago).
- **Upcoming Live** — list cards: date chip (TOD/TOM/FRI + time), title, subject·instructor, "in 2h 15m" pill, Enrol.
- **Today's Priorities** — "4 Due Today" pill + tabs (All/Assignments/Quizzes/Payments) + rows
  (type label + priority dot, title, course, status pill, action: Submit/Attempt/Pay Now/Review).
- **Recommended Courses** — gradient cards w/ price badge (₹15,000 / Free), title, N Subjects, More Info + Enrol. "Browse all".

### 2. My Courses (`/courses`)
- Title "My Courses" + "8 enrolled · 1 completed · 7 in progress" + **Filter** button.
- Search bar + status tabs: All / In progress / Completed / Not started.
- 3-col **course card grid**: gradient banner + status badge (In progress / Almost done / Completed / Just started)
  + book icon, title, instructor, "x/y lessons", duration (clock), progress % + bar, Continue + chat icon.

### 3. My Course detail (`/my-course/:slug`)
- "← Back to Courses", big title, "6 subjects · 69 lessons · Status: In progress".
- **Stats strip card**: Subjects / Lessons / Assignments / Quizzes / Status (each iconned) + "Overall Course Progress" bar.
- **Subjects** grid: gradient-banner cards w/ status badge + icon, code · instructor,
  4-metric row (Lessons x/y · Assign. · Quizzes · Progress %), **Continue Learning** button → `/learn`.

### 4. Lesson Player (`/learn`)  — 3-column
- **Top breadcrumb bar:** Courses › Subject › Lesson; right = course title + instructor "TTII Certified";
  "Continue: {lesson}" pill; lesson search; Progress % + bar; bell + avatar.
- **Left rail — "Course content x/12":** filter input, overall progress ("33% complete · 12h 40m left"),
  collapsible **Modules** with lesson rows (play/doc icon + title + duration/pages + completion check).
- **Center:** video player (HD badge, "Lesson 5 of 12", scrubber 6:08/18:05, 1.0x speed, settings, fullscreen,
  save + share). Below: "Module 2 · Lesson 2 · 18 min", title, instructor row, **Mark complete**, description.
  Tabs: **Transcript / Notes / Discussion / Q&A / Resources** (transcript = timestamped entries).
  Previous / Up next nav. Inline **quiz launcher** (question dots 1–10, "Start quiz").
  Course-level tabs: Overview / Discussions / Resources / Announcements / Reviews + "About this course" (Modules/Lessons/Duration/Level).
- **Right rail:** COURSE PROGRESS (circular ring + Lessons + Time spent + Streak 🔥), UPCOMING list,
  INSTRUCTOR card (avatar, rating, courses, learners, Message), ACHIEVEMENTS (x of 8), QUICK NOTE (Save to notebook).

### 5. Live Classes (`/live`)
- Title + subtitle + **List / Calendar** view toggle (Calendar → `/calendar`).
- Tabs: **Ongoing / Upcoming / Past Classes** (with counts).
- Cards: subject tag + duration (top), title, "with {instructor}", footer (date/time + attendee count).
  - Ongoing: red **LIVE** badge + "Started 12 min ago" + **Enrol Now**.
  - Upcoming: day/time + **Enrol Class**.
  - Past: date + "Recorded" + **View Recording** (play icon).

### 6. Assignments (`/assignments`)
- Title + 3 stat cards: Pending / Submitted / Graded.
- Tabs: Pending / Submitted / Graded.
- Rows: doc icon, title, subject · date, status badge, score "/100", action + download icon.
  - Pending: Not started / Draft saved / Due soon → **Submit**.
  - Submitted: "Awaiting review" → **Resubmit**.
  - Graded: green "Graded" + actual score (92/100) → **View Feedback**.

### 7. Exams (`/exams`)
- Title + 4 status stat cards: Available Now / Upcoming / Completed / Missed.
- Filter bar: search + All courses + All statuses + Any date dropdowns + **Reset**.
- Exam rows: file icon, title, status badge + proctoring badge (Proctored/Online),
  program · semester · subject, metadata strip **DATE / WINDOW / DURATION / MARKS (pass)**,
  action (Start Exam / Starts Soon / View Result / Awaiting Result / Missed) + AI/Live/Not Proctored label.

### 8. Grades (`/grades`)
- Title "Grades & Performance".
- Left card: **Overall GPA** donut ring (3.78 / 87.4% A−) + Rank #12 / Batch /142 / Percentile 92.
- Right card: **Subject-wise Scores** bar chart (purple bars, 0–100) + "+8% vs last term" pill.
- **Subject Breakdown**: rows = circular letter-grade chip (A/A−/A+/B+) + subject + % + progress bar.
- **Quick Stats** card: Highest Score / Target GPA / Attendance Score (icon tiles).

### 9. Payments & Billing (`/payments`)
- Title + **Pay Now** button.
- Left: **gradient Outstanding Balance card** — big ₹ amount, due date, programme,
  "3 of 5 installments paid" bar, **Pay ₹{amt}** + **Schedule** buttons.
- Right: **Installment Plan** list — terms w/ check (paid) or number (unpaid) + amount.
- **Payment History** table + **Export**: title, invoice# · date, amount, status badge (Paid/Pending), Invoice + Receipt links.
- (Directly relevant to the live Razorpay integration — Pay Now → Razorpay checkout.)

### 10. Certificates (`/certificates`)
- Title + "5 certificates earned · all blockchain-verified".
- Grid: certificate card = gradient banner + medal icon + "CERTIFICATE OF COMPLETION" + green **Verified** badge,
  title, "Issued {date}", cert ID (TTII-2025-DT-0142), actions: **PDF** (download) + share + verify/shield.

### 11. Calendar (`/calendar`)
- Title + **Add Event** button.
- Month nav (‹ May 2025 ›) + legend dots: Class / Exam / Deadline / Event.
- Full month grid (Sun–Sat); day cells show colored event chips by type.
- Below: **Today's Schedule** agenda — time + title + subject + type badge.

### 12. Notifications (`/notifications`)
- Title + "3 unread …" + **Mark all read**.
- Rows: type-colored circular icon tile, title + unread dot, description, timeago,
  severity badge (Success / Warning / Info / Primary).

### 13. Settings (`/settings`)
- Title "Settings" + tabs **Profile / Security**.
- Profile: avatar (camera overlay) + name + roll #; 2-col form (Full name, Email, Phone, DOB, City, Programme) + Cancel / Save Changes.
- Security: Current / New / Confirm password + **Two-Factor Authentication** toggle + Update password.

### 14. Course Landing / Sales (`/course/:slug`)
- "← Back to Dashboard".
- **Hero**: gradient banner + price badge (₹15,000) + category tag + big title.
- **Stats strip**: Duration / Subjects / Mode / Rating / Enrolled (icon each).
- **About this course** + description.
- **Learning Outcomes** — 2-col card grid (circular purple icon + outcome).
- **Who Should Enrol** — 2-col audience card grid.
- **Curriculum** — numbered accordion (Module 1 expanded w/ lessons; 2–4 collapsed w/ chevron).
- **Internationally Recognized Certification** — shield-icon partner cards w/ green verified badge.
- **Sticky right sidebar**: PROGRAM FEE ₹15,000 incl. taxes + **Enrol Now** + **Download Brochure** + feature list.
- **Bottom CTA**: "Ready to Start Your Learning Journey?" + Enrol Now / Download Brochure.

---

## 5. Component Inventory (build/port once, reuse)

- **StatTile** — icon chip + big value + label + delta subtext.
- **GradientBannerCard** — course / certificate / payment card with diagonal-gradient header + status badge.
- **StatusPill** — semantic soft-bg pill (Live, Due Today, Overdue, Awaiting review, Verified, Paid/Pending, severity).
- **ProgressBar** + **ProgressRing** (donut for GPA / course progress).
- **TabbedFilter** — segmented tabs w/ counts (used on Courses, Assignments, Live, Today's Priorities, Settings).
- **ListRow** — icon tile + title + meta + right-side status/score + action button(s) (Assignments, Exams, Notifications, Payment History).
- **MetaStrip** — labeled key/value row (Exam DATE/WINDOW/DURATION/MARKS; course-detail stats).
- **Accordion** — numbered module accordion (Course landing curriculum; Lesson player module tree).
- **BadgeCard** — circular-gradient achievement badge.
- **CalendarGrid** + **AgendaList**.
- **PageHeader** — title + subtitle + right-aligned primary action.

---

## 6. Replication Notes

1. **Already shipped:** Dashboard, Live Classes, Exams (per session memory) — verify the brand-mapped tokens
   above match what landed, then reuse the same component set for the remaining 11 surfaces.
2. **Highest-value remaining ports** (data already exists in our API):
   Courses list + Course detail + Lesson player (My Courses already rebuilt once — align to EduPulse layout),
   Assignments, Grades, Payments (ties into live Razorpay), Certificates, Calendar, Notifications, Settings.
3. **Course Landing (`/course/:slug`)** is a marketing/enrol funnel — only port if we want a public/preview
   course page; lower priority for the authenticated portal.
4. **Data gaps** (EduPulse shows UI we may not yet have data for): proctoring detail, blockchain cert verification,
   multi-course GPA/percentile/rank, achievements/badges, attendance score, 2FA. Flag these before porting those sections.
5. Keep **semantic colors** (success/warning/info/destructive) identical; only re-anchor the **brand** hue + font + page bg.

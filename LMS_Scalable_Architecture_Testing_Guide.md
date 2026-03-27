# LMS Scalable Architecture — Testing Guide

**Prepared for:** Project Manager / QA Team
**Date:** 26 March 2026
**Version:** 1.0
**Application URL:** https://teachers-training-institute-of-india.onrender.com
**Admin Portal URL:** https://admin.teachersindia.in (or use the Render URL above)

---

## Login Credentials

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| **Super Admin** | admin@ttii.test | Admin@123 | Admin Portal |
| **Sub Admin** | subadmin@ttii.test | Subadmin@123 | Admin Portal |
| **Counsellor** | counsellor@ttii.test | Counsellor@123 | Admin Portal |
| **Student** | student@ttii.test | Student@123 | Student Portal |
| **Centre** | centre@ttii.test | Centre@123 | Centre Portal |
| **Associate** | associate@ttii.test | Associate@123 | Centre Portal |
| **Instructor** | instructor@ttii.test | Instructor@123 | Admin Portal |

**Note:** Use the **Super Admin** account for all testing below unless stated otherwise.

---

## What Was Built

We implemented a scalable, reusable academic architecture for the LMS. Here is what changed in simple terms:

1. **Reusable Subjects** — A subject (e.g., "Child Development") can now be shared across multiple courses instead of being locked to one course. Create it once, use it everywhere.

2. **Programs** — A new layer above courses. You can now group multiple courses into a Program (e.g., "Diploma in Montessori Education" contains 3 courses).

3. **Course Offerings** — The same course can now have multiple delivery batches. For example, "Montessori Foundations" can have a January 2026 cohort, an April 2026 self-paced offering, and a July 2026 hybrid batch — all sharing the same content.

4. **Content Library** — All videos, documents, and articles are now stored in a central library. The same content can be attached to multiple lessons without duplication.

5. **Completion Policies and Certificates** — Admins can define rules for when a student is considered "complete" (e.g., 90% progress + 75% attendance + all exams passed). Certificates can be issued and revoked with unique verification codes.

---

## How to Test — Step by Step

### Before You Start

1. Open the application URL in your browser
2. Log in with the **Super Admin** credentials from the table above
3. You should see the Admin Dashboard
4. Look at the left sidebar under **"Courses"** — you will see the new menu items

---

### TEST 1: Programs (New Feature)

**Where:** Sidebar > Courses > **Programs**

#### Test 1.1 — Create a Program
1. Click **"+ New Program"** button
2. Fill in:
   - Title: "Test Diploma in Early Childhood Education"
   - Code: "TDECE-2026"
   - Level: Select "Diploma" from dropdown
   - Duration: "1 Year"
   - Description: Any text
3. Click **"Create"**
4. **Expected:** The program appears in the table with the details you entered

#### Test 1.2 — Edit a Program
1. Find the program you just created in the table
2. Click the **"Edit"** action button
3. Change the title to "Updated Diploma Program"
4. Click **"Update"**
5. **Expected:** Title updates in the table

#### Test 1.3 — Add Courses to a Program
1. Click the **"Courses"** action button on your program
2. You will see the Program Courses page
3. Click **"Add Courses"** button
4. A dialog appears showing all available courses
5. Select one or more courses using the checkboxes
6. Click **"Add Selected"**
7. **Expected:** The courses appear in the program's course list

#### Test 1.4 — Remove a Course from Program
1. On the same Program Courses page
2. Click **"Remove"** on one of the courses
3. Confirm the removal
4. **Expected:** Course is removed from the list but still exists in the system (not deleted)

#### Test 1.5 — Delete Program
1. Go back to Programs list
2. Click **"Delete"** on the test program
3. Confirm deletion
4. **Expected:** Program disappears from the list

---

### TEST 2: Reusable Subjects (Enhanced Feature)

**Where:** Sidebar > Courses > **Course Directory** > click a course > Subjects

#### Test 2.1 — View Subjects with Usage Count
1. Go to Course Directory
2. Click on any course (e.g., "PG Diploma in Montessori Teacher Training")
3. Click the **"Subjects"** action
4. **Expected:** You see a table of subjects with a **"Used In"** column showing how many courses each subject belongs to (e.g., "1 course" or "2 courses")

#### Test 2.2 — Create a New Subject
1. On the Course Subjects page, click **"+ New Subject"**
2. Fill in Title: "Test Reusable Subject"
3. Click **"Add Subject"**
4. **Expected:** Subject appears in the table with "Used In: 1 course"

#### Test 2.3 — Link a Subject to Another Course (KEY TEST)
1. Go to Course Directory
2. Open a **different** course's Subjects page
3. Click **"Link Existing Subject"** button
4. A dialog appears showing ALL subjects in the system
5. Find "Test Reusable Subject" — it should show "Used in 1 course"
6. Check its checkbox and click **"Link Selected"**
7. **Expected:** The subject now appears in this course too

#### Test 2.4 — Verify Subject is Shared
1. Go back to the first course's Subjects page
2. **Expected:** "Test Reusable Subject" still appears here with "Used In: 2 courses"
3. Go to the second course's Subjects page
4. **Expected:** "Test Reusable Subject" appears here too with "Used In: 2 courses"

#### Test 2.5 — Remove Subject from One Course
1. On the second course's Subjects page, click **"Remove"** on "Test Reusable Subject"
2. The confirmation message should say: *"It's shared across 2 courses — only the link will be removed"*
3. Confirm
4. **Expected:** Subject disappears from this course but remains in the first course
5. Go to the first course — subject should still be there with "Used In: 1 course"

#### Test 2.6 — Clean Up
1. On the first course's Subjects page, click **"Remove"** on "Test Reusable Subject"
2. The confirmation should say: *"This subject is only used here, so it will also be permanently deleted"*
3. Confirm
4. **Expected:** Subject is fully deleted

---

### TEST 3: Course Offerings (New Feature)

**Where:** Sidebar > Courses > **Course Offerings**

#### Test 3.1 — Create a Course Offering
1. Click **"+ New Offering"**
2. You will see a multi-section form:
   - **Course & Program:** Select a course (required). Program is optional.
   - **Offering Details:** Enter title "January 2026 Cohort", code "JAN-26", delivery mode "Cohort"
   - **Schedule & Capacity:** Set start date, end date, max enrollment (e.g., 30), pricing (e.g., 9999)
   - **Status:** Leave as "Draft"
3. Click **"Create Offering"**
4. **Expected:** You are taken back to the offerings list, your offering appears

#### Test 3.2 — View Offerings List
1. On the Offerings page, you should see:
   - Summary cards at the top: Total Offerings, Active, Total Enrolled
   - Filter dropdowns for Course and Status
   - Table with columns: Offering name, Course, Mode, Centre, Start date, Enrolled count, Cohorts, Status
2. **Expected:** Your new offering appears with status "Draft"

#### Test 3.3 — Filter Offerings
1. Select a specific course from the Course dropdown
2. **Expected:** Only offerings for that course are shown
3. Select "Draft" from the Status dropdown
4. **Expected:** Only draft offerings are shown

#### Test 3.4 — Edit an Offering
1. Click **"Edit"** on your test offering
2. Change delivery mode to "Hybrid" and status to "Published"
3. Click **"Update Offering"**
4. **Expected:** Changes are saved and reflected in the list

#### Test 3.5 — Delete Offering
1. Click **"Delete"** on the test offering
2. Confirm
3. **Expected:** Offering disappears from the list

---

### TEST 4: Content Library (New Feature)

**Where:** Sidebar > Courses > **Content Library**

#### Test 4.1 — Create a Content Asset
1. Click **"+ New Asset"**
2. Fill in:
   - Title: "Test Introduction Video"
   - Type: "Video"
   - Duration: "10:30"
   - Video URL: https://example.com/test-video.mp4
   - Summary: "A test video"
3. Click **"Create"**
4. **Expected:** Asset appears in the table

#### Test 4.2 — Filter Assets by Type
1. Use the "Asset Type" dropdown
2. Select "Video"
3. **Expected:** Only video assets are shown
4. Select "Document"
5. **Expected:** Only document assets are shown

#### Test 4.3 — Create Different Asset Types
1. Create an "Audio" asset with an audio file URL
2. Create a "Document" asset with a file URL
3. Create an "Article" asset with content text
4. **Expected:** All appear in the library with correct type badges

#### Test 4.4 — Edit an Asset
1. Click **"Edit"** on a test asset
2. Change the title and duration
3. Click **"Update"**
4. **Expected:** Changes saved

#### Test 4.5 — Delete Assets
1. Delete all the test assets you created
2. **Expected:** They disappear from the list. If an asset is used in lessons, the system warns you.

---

### TEST 5: Completion Policies (New Feature)

**Where:** Sidebar > Courses > **Completion Policies**

#### Test 5.1 — Create a Completion Policy
1. Click **"+ New Policy"**
2. Fill in:
   - Title: "Standard Diploma Completion"
   - Course: Select any course (optional — leave empty for a global policy)
   - Min Progress: 90%
   - Min Exam Score: 60%
   - Min Attendance: 75%
   - Check "Require all assignments completed"
   - Check "Require all exams passed"
3. Click **"Create"**
4. **Expected:** Policy appears in the table showing all the rules

#### Test 5.2 — Verify Policy Display
1. The table should show columns: Policy Name, Course, Min Progress %, Min Exam %, Min Attendance %, Manual Approval
2. **Expected:** Values match what you entered

#### Test 5.3 — Edit a Policy
1. Click **"Edit"** on the policy
2. Change Min Progress to 80%
3. Click **"Update"**
4. **Expected:** Value updates in the table

#### Test 5.4 — Delete Policy
1. Click **"Delete"** on the test policy
2. Confirm
3. **Expected:** Policy removed

---

### TEST 6: Certificates (New Feature)

**Where:** Sidebar > Courses > **Certificates**

#### Test 6.1 — View Certificates Page
1. Navigate to the Certificates page
2. You should see:
   - Summary cards: Total Issued, Active, Revoked
   - A table of issued certificates (may be empty initially)
3. **Expected:** Page loads without errors

**Note:** Certificates are issued through the backend API when a student completes a course. The admin panel shows issued certificates and allows revocation. To test certificate issuance, the QA team can use the API directly or wait for students to complete courses through the student portal.

---

### TEST 7: Add Lesson (Existing Feature — Verify No Regression)

**Where:** Sidebar > Courses > **Add Lesson**

#### Test 7.1 — Create a Lesson
1. Select a Course from the dropdown
2. Select a Subject from the dropdown (loads based on course selection)
3. Click **"+ Add Lesson"**
4. Enter title: "Test Lesson"
5. Click **"Create"**
6. **Expected:** Lesson appears in the table

#### Test 7.2 — Add Files to Lesson
1. Click **"Manage Files"** on the test lesson
2. Click **"+ Video"** and add a test video
3. Click **"+ Document"** and add a test document
4. **Expected:** Both appear in the files list with correct type badges

#### Test 7.3 — Clean Up
1. Delete the test files and lesson
2. **Expected:** All removed cleanly

---

### TEST 8: Sidebar Navigation (Verify New Items)

**Where:** Left sidebar

1. Expand the **"Courses"** section
2. **Expected:** You should see these items in this order:
   - Programs (NEW)
   - Course Directory
   - Course Offerings (NEW)
   - Content Library (NEW)
   - Add Lesson
   - Packages
   - Completion Policies (NEW)
   - Certificates (NEW)

---

### TEST 9: Security Checks

#### Test 9.1 — Unauthenticated Access
1. Open a new browser window (not logged in)
2. Try to access https://teachers-training-institute-of-india.onrender.com/api/admin/programs directly
3. **Expected:** You get a 401 Unauthorized error, NOT the data

#### Test 9.2 — Student Cannot Access Admin Features
1. Log in as a Student (student@ttii.test / Student@123)
2. Try to navigate to any admin page
3. **Expected:** Access denied — student portal should load instead of admin panel

---

## Summary of New Pages

| # | Page | Location in Sidebar | What It Does |
|---|------|-------------------|--------------|
| 1 | Programs | Courses > Programs | Create credential containers (Diploma, PG Diploma, Certification) that group multiple courses |
| 2 | Program Courses | Click "Courses" on a Program | Add/remove courses from a program |
| 3 | Course Offerings | Courses > Course Offerings | Create delivery instances (batches) for courses with dates, pricing, capacity |
| 4 | Add/Edit Offering | Click "New Offering" or "Edit" | Full form to configure an offering |
| 5 | Content Library | Courses > Content Library | Central library of all videos, documents, audio — reusable across lessons |
| 6 | Completion Policies | Courses > Completion Policies | Define rules for course completion (progress %, attendance %, exams) |
| 7 | Certificates | Courses > Certificates | View and manage issued certificates |

## Enhanced Existing Pages

| Page | What Changed |
|------|-------------|
| **Course Subjects** | "Link Existing Subject" button (previously "Select from DB" which duplicated). New "Used In" column shows how many courses share each subject. "Remove" smartly unlinks vs deletes. |
| **Add Lesson** | Lessons no longer require a course_id — they are linked to subjects only, which makes them automatically available in any course that uses that subject. |

---

## Known Behaviors

- The Content Library initially contains all existing lesson content (~610 items) that were migrated from the old system
- Course Offerings shows ~12 auto-created offerings that were generated from existing enrollment data
- Certificate issuance is currently API-only (admin can view/revoke, but issuance happens when a student completes their course requirements)
- "Used In" count on subjects shows how many active course links exist for that subject

---

*End of Testing Guide*

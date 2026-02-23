DROP TABLE IF EXISTS zoom_history;
DROP TABLE IF EXISTS app_version;
DROP TABLE IF EXISTS frontend_settings;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS file;
DROP TABLE IF EXISTS folder;
DROP TABLE IF EXISTS student_document;
DROP TABLE IF EXISTS qualification;
DROP TABLE IF EXISTS centre_course_plans;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS centres;
DROP TABLE IF EXISTS review_like;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS feed_comments;
DROP TABLE IF EXISTS feed_like;
DROP TABLE IF EXISTS feed_watched;
DROP TABLE IF EXISTS feed;
DROP TABLE IF EXISTS event_registration;
DROP TABLE IF EXISTS recorded_events;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS instructor_enrol;
DROP TABLE IF EXISTS demo_video;
DROP TABLE IF EXISTS support_chat;
DROP TABLE IF EXISTS live_class;
DROP TABLE IF EXISTS lesson_files_report;
DROP TABLE IF EXISTS practice_answer;
DROP TABLE IF EXISTS practice_attempt;
DROP TABLE IF EXISTS material_progress;
DROP TABLE IF EXISTS video_progress_status;
DROP TABLE IF EXISTS quiz;
DROP TABLE IF EXISTS exam_answer;
DROP TABLE IF EXISTS exam_attempt;
DROP TABLE IF EXISTS exam_questions;
DROP TABLE IF EXISTS question_bank;
DROP TABLE IF EXISTS assignment_submissions;
DROP TABLE IF EXISTS saved_assignments;
DROP TABLE IF EXISTS assignment;
DROP TABLE IF EXISTS exam;
DROP TABLE IF EXISTS vimeo_videolinks;
DROP TABLE IF EXISTS lesson_files;
DROP TABLE IF EXISTS lesson;
DROP TABLE IF EXISTS cohort_students;
DROP TABLE IF EXISTS cohorts;
DROP TABLE IF EXISTS subject;
DROP TABLE IF EXISTS create_order;
DROP TABLE IF EXISTS coupon_code;
DROP TABLE IF EXISTS subject_package;
DROP TABLE IF EXISTS package;
DROP TABLE IF EXISTS student_fee;
DROP TABLE IF EXISTS payment_info;
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS auth_audit_log;
DROP TABLE IF EXISTS otp_challenge;
DROP TABLE IF EXISTS password_reset_token;
DROP TABLE IF EXISTS auth_session;
DROP TABLE IF EXISTS notification_read;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS enrol;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  student_id TEXT,
  name TEXT,
  email TEXT,
  user_email TEXT,
  phone TEXT,
  country_code TEXT,
  role_id INTEGER,
  user_designation_id INTEGER,
  centre_id INTEGER,
  added_under_centre INTEGER,
  username TEXT,
  password TEXT,
  verification_code TEXT,
  status INTEGER NOT NULL DEFAULT 0,
  device_id TEXT,
  course_id INTEGER,
  notification_token TEXT,
  profile_picture TEXT,
  image TEXT,
  academic_year TEXT,
  premium INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  UNIQUE (email),
  UNIQUE (user_email)
);

CREATE INDEX idx_users_phone ON users (phone);
CREATE INDEX idx_users_role ON users (role_id);
CREATE INDEX idx_users_deleted_at ON users (deleted_at);
CREATE INDEX idx_users_course_id ON users (course_id);
CREATE INDEX idx_users_centre_id ON users (centre_id);
CREATE INDEX idx_users_added_under_centre ON users (added_under_centre);

CREATE TABLE auth_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME,
  revoked_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE (token_hash),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_auth_session_user_revoked ON auth_session (user_id, revoked_at);
CREATE INDEX idx_auth_session_expires_at ON auth_session (expires_at);

CREATE TABLE password_reset_token (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  requested_ip TEXT,
  requested_user_agent TEXT,
  UNIQUE (token_hash),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_password_reset_token_user_used ON password_reset_token (user_id, used_at);
CREATE INDEX idx_password_reset_token_expires_at ON password_reset_token (expires_at);

CREATE TABLE otp_challenge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  delivery_target TEXT,
  otp_hash TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  requested_ip TEXT,
  requested_user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_otp_challenge_user_purpose_used ON otp_challenge (user_id, purpose, used_at);
CREATE INDEX idx_otp_challenge_expires_at ON otp_challenge (expires_at);

CREATE TABLE auth_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event TEXT NOT NULL,
  identifier TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_auth_audit_event_created ON auth_audit_log (event, created_at);
CREATE INDEX idx_auth_audit_user ON auth_audit_log (user_id);
CREATE INDEX idx_auth_audit_created_at ON auth_audit_log (created_at);

CREATE TABLE centres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  centre_id INTEGER,
  centre_name TEXT NOT NULL,
  country_id INTEGER,
  state_id INTEGER,
  district_id INTEGER,
  address TEXT,
  contact_person TEXT,
  contact_person_designation TEXT,
  country_code TEXT,
  phone TEXT,
  whatsapp TEXT,
  secondary_phone TEXT,
  email TEXT,
  registraion_certificate TEXT,
  affiliation_document TEXT,
  wallet_balance REAL NOT NULL DEFAULT 0,
  date_of_registration DATE,
  date_of_expiry DATE,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_centres_centre_id ON centres (centre_id);
CREATE INDEX idx_centres_phone ON centres (country_code, phone);
CREATE INDEX idx_centres_email ON centres (email);
CREATE INDEX idx_centres_deleted_at ON centres (deleted_at);

CREATE TABLE wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  centre_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'credit',
  amount REAL NOT NULL DEFAULT 0,
  remarks TEXT,
  reference_id TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_wallet_transactions_centre ON wallet_transactions (centre_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions (transaction_type);
CREATE INDEX idx_wallet_transactions_deleted_at ON wallet_transactions (deleted_at);

CREATE TABLE centre_fundrequests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  centre_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  date DATE,
  transaction_receipt TEXT,
  description TEXT,
  attachment_file TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_centre_fundrequests_centre ON centre_fundrequests (centre_id);
CREATE INDEX idx_centre_fundrequests_status ON centre_fundrequests (status);
CREATE INDEX idx_centre_fundrequests_deleted_at ON centre_fundrequests (deleted_at);

CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT,
  name TEXT NOT NULL,
  country_code TEXT,
  phone TEXT,
  email TEXT,
  user_email TEXT,
  username TEXT,
  password TEXT,
  image TEXT,
  status TEXT DEFAULT 'pending',
  is_converted INTEGER NOT NULL DEFAULT 0,
  pipeline TEXT,
  pipeline_user INTEGER,
  course_id INTEGER,
  batch_id INTEGER,
  enrollment_date DATE,
  enrollment_status TEXT,
  mode_of_study TEXT,
  preferred_language TEXT,
  date_of_birth DATE,
  age INTEGER,
  gender TEXT,
  nationality TEXT,
  marital_status TEXT,
  aadhar_no TEXT,
  passport_no TEXT,
  whatsapp_no TEXT,
  second_code TEXT,
  second_phone TEXT,
  country_id INTEGER,
  district TEXT,
  state TEXT,
  address TEXT,
  native_address TEXT,
  father_name TEXT,
  mother_name TEXT,
  guardian_name TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  emergency_relation TEXT,
  learning_disabilities TEXT,
  accessibility_needs TEXT,
  marketing_source TEXT,
  added_under_centre INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_applications_status ON applications (status);
CREATE INDEX idx_applications_converted ON applications (is_converted);
CREATE INDEX idx_applications_course ON applications (course_id);
CREATE INDEX idx_applications_pipeline_user ON applications (pipeline_user);
CREATE INDEX idx_applications_centre ON applications (added_under_centre);
CREATE INDEX idx_applications_created_by ON applications (created_by);
CREATE INDEX idx_applications_deleted_at ON applications (deleted_at);
CREATE INDEX idx_applications_email ON applications (email, user_email);

CREATE TABLE centre_course_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  centre_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  assigned_amount REAL NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_centre_course_plans_centre_course ON centre_course_plans (centre_id, course_id);
CREATE INDEX idx_centre_course_plans_deleted_at ON centre_course_plans (deleted_at);

CREATE TABLE qualification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  qualification TEXT,
  institution TEXT,
  year_of_passing TEXT,
  percentage_or_grade TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_qualification_user ON qualification (user_id);
CREATE INDEX idx_qualification_deleted_at ON qualification (deleted_at);

CREATE TABLE student_document (
  student_document_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  label TEXT,
  file TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_student_document_student ON student_document (student_id);
CREATE INDEX idx_student_document_deleted_at ON student_document (deleted_at);

CREATE TABLE folder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL DEFAULT 0,
  centre_id INTEGER,
  name TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_folder_parent ON folder (parent_id);
CREATE INDEX idx_folder_centre ON folder (centre_id);
CREATE INDEX idx_folder_deleted_at ON folder (deleted_at);

CREATE TABLE file (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER NOT NULL DEFAULT 0,
  centre_id INTEGER,
  name TEXT NOT NULL,
  type TEXT,
  size INTEGER,
  path TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_file_folder ON file (folder_id);
CREATE INDEX idx_file_centre ON file (centre_id);
CREATE INDEX idx_file_deleted_at ON file (deleted_at);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL UNIQUE,
  value TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_settings_deleted_at ON settings (deleted_at);

CREATE TABLE frontend_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL UNIQUE,
  value TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_frontend_settings_deleted_at ON frontend_settings (deleted_at);

CREATE TABLE app_version (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_version TEXT,
  app_version_ios TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_app_version_deleted_at ON app_version (deleted_at);

CREATE TABLE zoom_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  live_id INTEGER NOT NULL,
  join_date DATE,
  join_time TEXT,
  leave_time TEXT,
  duration TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_zoom_history_live_date ON zoom_history (live_id, join_date);
CREATE INDEX idx_zoom_history_user ON zoom_history (user_id);
CREATE INDEX idx_zoom_history_deleted_at ON zoom_history (deleted_at);

CREATE TABLE category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  parent INTEGER,
  slug TEXT,
  description TEXT,
  short_description TEXT,
  video_type TEXT,
  video_url TEXT,
  font_awesome_class TEXT,
  thumbnail TEXT,
  category_icon TEXT,
  status TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_category_deleted_at ON category (deleted_at);

CREATE TABLE course (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  title TEXT NOT NULL,
  short_name TEXT,
  label TEXT,
  status TEXT,
  price REAL,
  sale_price REAL,
  total_amount REAL,
  description TEXT,
  duration TEXT,
  thumbnail TEXT,
  course_icon TEXT,
  features TEXT,
  is_free_course INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_course_category ON course (category_id);
CREATE INDEX idx_course_deleted_at ON course (deleted_at);

CREATE TABLE package (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  type INTEGER,
  category_id INTEGER,
  course_id INTEGER,
  amount REAL,
  discount REAL,
  is_free INTEGER,
  package_type TEXT,
  remarks TEXT,
  offline INTEGER,
  start_date DATE,
  end_date DATE,
  duration INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_package_course ON package (course_id);
CREATE INDEX idx_package_deleted_at ON package (deleted_at);
CREATE INDEX idx_package_active_window ON package (start_date, end_date);

CREATE TABLE subject_package (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id INTEGER NOT NULL,
  subject_id INTEGER,
  amount REAL,
  discount REAL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_subject_package_package ON subject_package (package_id);
CREATE INDEX idx_subject_package_deleted_at ON subject_package (deleted_at);

CREATE TABLE coupon_code (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  package_id INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL DEFAULT 0,
  discount_perc REAL NOT NULL DEFAULT 0,
  total_no INTEGER NOT NULL DEFAULT 0,
  per_user_no INTEGER NOT NULL DEFAULT 0,
  validity INTEGER NOT NULL DEFAULT 1,
  start_date DATE,
  end_date DATE,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_coupon_code_code ON coupon_code (code);
CREATE INDEX idx_coupon_code_package_user ON coupon_code (package_id, user_id);
CREATE INDEX idx_coupon_code_validity_window ON coupon_code (validity, start_date, end_date);
CREATE INDEX idx_coupon_code_deleted_at ON coupon_code (deleted_at);

CREATE TABLE create_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  payment_id_raz TEXT,
  datetime DATETIME,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  UNIQUE (order_id)
);

CREATE INDEX idx_create_order_user_course ON create_order (user_id, course_id);
CREATE INDEX idx_create_order_status ON create_order (order_status);
CREATE INDEX idx_create_order_payment_id ON create_order (payment_id_raz);
CREATE INDEX idx_create_order_deleted_at ON create_order (deleted_at);

CREATE TABLE subject (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  master_subject_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  "order" INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_subject_course ON subject (course_id);
CREATE INDEX idx_subject_master ON subject (master_subject_id);
CREATE INDEX idx_subject_deleted_at ON subject (deleted_at);

CREATE TABLE lesson (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  free TEXT,
  thumbnail TEXT,
  "order" INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_lesson_course ON lesson (course_id);
CREATE INDEX idx_lesson_subject ON lesson (subject_id);
CREATE INDEX idx_lesson_deleted_at ON lesson (deleted_at);

CREATE TABLE lesson_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL,
  parent_file_id INTEGER,
  sub_title TEXT,
  title TEXT,
  summary TEXT,
  duration TEXT,
  lesson_provider TEXT,
  video_type TEXT,
  video_url TEXT,
  download_url TEXT,
  lesson_type TEXT,
  attachment_type TEXT,
  attachment TEXT,
  audio_file TEXT,
  thumbnail TEXT,
  free TEXT,
  "order" INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_lesson_files_lesson ON lesson_files (lesson_id);
CREATE INDEX idx_lesson_files_attachment_type ON lesson_files (attachment_type);
CREATE INDEX idx_lesson_files_deleted_at ON lesson_files (deleted_at);
CREATE INDEX idx_lesson_files_parent ON lesson_files (parent_file_id);

CREATE TABLE demo_video (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT,
  video_type TEXT,
  video_url TEXT,
  thumbnail TEXT,
  "order" INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_demo_video_course ON demo_video (course_id);
CREATE INDEX idx_demo_video_deleted_at ON demo_video (deleted_at);

CREATE TABLE training_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  category TEXT,
  video_type TEXT,
  video_url TEXT,
  thumbnail TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_training_videos_category ON training_videos (category);
CREATE INDEX idx_training_videos_deleted_at ON training_videos (deleted_at);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  event_date DATE,
  from_time TEXT,
  to_time TEXT,
  image TEXT,
  objectives TEXT,
  duration TEXT,
  is_recording_available INTEGER NOT NULL DEFAULT 0,
  instructor_id INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_events_event_date ON events (event_date);
CREATE INDEX idx_events_instructor ON events (instructor_id);
CREATE INDEX idx_events_deleted_at ON events (deleted_at);

CREATE TABLE recorded_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  title TEXT,
  video_url TEXT,
  duration TEXT,
  summary TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_recorded_events_event ON recorded_events (event_id);
CREATE INDEX idx_recorded_events_deleted_at ON recorded_events (deleted_at);

CREATE TABLE event_registration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  name TEXT,
  phone TEXT,
  attend_status TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_event_registration_event_user ON event_registration (event_id, user_id);
CREATE INDEX idx_event_registration_deleted_at ON event_registration (deleted_at);

CREATE TABLE feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  feed_category_id INTEGER,
  course_id INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  instructor_id INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_feed_course ON feed (course_id);
CREATE INDEX idx_feed_deleted_at ON feed (deleted_at);

CREATE TABLE feed_watched (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_feed_watched_feed_user ON feed_watched (feed_id, user_id);
CREATE INDEX idx_feed_watched_deleted_at ON feed_watched (deleted_at);

CREATE TABLE feed_like (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_feed_like_feed_user ON feed_like (feed_id, user_id);
CREATE INDEX idx_feed_like_deleted_at ON feed_like (deleted_at);

CREATE TABLE feed_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  comment TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_feed_comments_feed ON feed_comments (feed_id);
CREATE INDEX idx_feed_comments_user ON feed_comments (user_id);
CREATE INDEX idx_feed_comments_deleted_at ON feed_comments (deleted_at);

CREATE TABLE review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER,
  event_id INTEGER,
  item_type INTEGER,
  user_id INTEGER,
  rating REAL,
  review TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_review_course ON review (course_id);
CREATE INDEX idx_review_user ON review (user_id);
CREATE INDEX idx_review_deleted_at ON review (deleted_at);

CREATE TABLE review_like (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_review_like_review ON review_like (review_id);
CREATE INDEX idx_review_like_user ON review_like (user_id);
CREATE INDEX idx_review_like_deleted_at ON review_like (deleted_at);

CREATE TABLE instructor_enrol (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_instructor_enrol_course ON instructor_enrol (course_id);
CREATE INDEX idx_instructor_enrol_instructor ON instructor_enrol (instructor_id);
CREATE INDEX idx_instructor_enrol_deleted_at ON instructor_enrol (deleted_at);

CREATE TABLE cohorts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER,
  course_id INTEGER,
  language_id INTEGER,
  centre_id INTEGER,
  cohort_id TEXT,
  title TEXT,
  start_date DATE,
  end_date DATE,
  instructor_id INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_cohorts_subject ON cohorts (subject_id);
CREATE INDEX idx_cohorts_centre ON cohorts (centre_id);
CREATE INDEX idx_cohorts_deleted_at ON cohorts (deleted_at);

CREATE TABLE live_class (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id INTEGER,
  session_id TEXT,
  title TEXT,
  date DATE,
  fromTime TEXT,
  toTime TEXT,
  repeat_dates TEXT,
  zoom_id TEXT,
  password TEXT,
  video_url TEXT,
  is_repetitive INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_live_class_cohort_date ON live_class (cohort_id, date);
CREATE INDEX idx_live_class_deleted_at ON live_class (deleted_at);

CREATE TABLE cohort_students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_cohort_students_user ON cohort_students (user_id);
CREATE INDEX idx_cohort_students_cohort ON cohort_students (cohort_id);
CREATE INDEX idx_cohort_students_deleted_at ON cohort_students (deleted_at);

CREATE TABLE payment_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  account_id INTEGER,
  package_id INTEGER,
  amount_paid REAL,
  discount REAL,
  coupon_id INTEGER,
  razorpay_payment_id TEXT,
  user_phone TEXT,
  user_email TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  package_duration INTEGER,
  code TEXT,
  expiry_date DATE,
  payment_date DATETIME,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_payment_info_user_course ON payment_info (user_id, course_id);
CREATE INDEX idx_payment_info_expiry_date ON payment_info (expiry_date);
CREATE INDEX idx_payment_info_payment_id ON payment_info (razorpay_payment_id);
CREATE INDEX idx_payment_info_coupon_id ON payment_info (coupon_id);
CREATE INDEX idx_payment_info_deleted_at ON payment_info (deleted_at);

CREATE TABLE student_fee (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_student_fee_user_course ON student_fee (user_id, course_id);
CREATE INDEX idx_student_fee_due_date ON student_fee (due_date);
CREATE INDEX idx_student_fee_deleted_at ON student_fee (deleted_at);

CREATE TABLE video_progress_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  lesson_file_id INTEGER NOT NULL,
  total_duration TEXT,
  user_progress TEXT,
  status INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_video_progress_user_file ON video_progress_status (user_id, lesson_file_id);
CREATE INDEX idx_video_progress_course ON video_progress_status (course_id);
CREATE INDEX idx_video_progress_status ON video_progress_status (status);
CREATE INDEX idx_video_progress_deleted_at ON video_progress_status (deleted_at);

CREATE TABLE material_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  lesson_file_id INTEGER NOT NULL,
  attachment_type TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_material_progress_user_file ON material_progress (user_id, lesson_file_id);
CREATE INDEX idx_material_progress_course ON material_progress (course_id);
CREATE INDEX idx_material_progress_deleted_at ON material_progress (deleted_at);

CREATE TABLE practice_attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_id TEXT,
  lesson_file_id INTEGER,
  question_no INTEGER NOT NULL DEFAULT 0,
  question_id TEXT,
  start_time DATETIME,
  end_time DATETIME,
  time_taken TEXT,
  correct INTEGER NOT NULL DEFAULT 0,
  incorrect INTEGER NOT NULL DEFAULT 0,
  skip INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  submit_status INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_practice_attempt_user ON practice_attempt (user_id);
CREATE INDEX idx_practice_attempt_lesson_file ON practice_attempt (lesson_file_id);
CREATE INDEX idx_practice_attempt_submit_status ON practice_attempt (submit_status);
CREATE INDEX idx_practice_attempt_deleted_at ON practice_attempt (deleted_at);

CREATE TABLE lesson_files_report (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_file_id INTEGER NOT NULL,
  report_file TEXT,
  file_type TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_lesson_files_report_user_file ON lesson_files_report (user_id, lesson_file_id);
CREATE INDEX idx_lesson_files_report_deleted_at ON lesson_files_report (deleted_at);

CREATE TABLE quiz (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_file_id INTEGER NOT NULL,
  question TEXT,
  question_type INTEGER NOT NULL DEFAULT 0,
  answer_id TEXT,
  answer_ids TEXT,
  answers TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_quiz_lesson_file ON quiz (lesson_file_id);
CREATE INDEX idx_quiz_deleted_at ON quiz (deleted_at);

CREATE TABLE practice_answer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer_correct TEXT,
  answer_submitted TEXT,
  answer_status INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_practice_answer_attempt ON practice_answer (attempt_id);
CREATE INDEX idx_practice_answer_user ON practice_answer (user_id);
CREATE INDEX idx_practice_answer_deleted_at ON practice_answer (deleted_at);

CREATE TABLE exam (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  mark REAL,
  duration TEXT,
  from_date DATE,
  to_date DATE,
  from_time TEXT,
  to_time TEXT,
  course_id INTEGER,
  subject_id INTEGER,
  lesson_id INTEGER,
  batch_id INTEGER,
  free TEXT,
  publish_result INTEGER,
  is_practice INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_exam_course ON exam (course_id);
CREATE INDEX idx_exam_subject ON exam (subject_id);
CREATE INDEX idx_exam_lesson ON exam (lesson_id);
CREATE INDEX idx_exam_deleted_at ON exam (deleted_at);

CREATE TABLE question_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER,
  subject_id INTEGER,
  course_id INTEGER,
  category_id INTEGER,
  type INTEGER,
  q_type INTEGER,
  title TEXT,
  title_file TEXT,
  hint TEXT,
  hint_file TEXT,
  solution TEXT,
  solution_file TEXT,
  is_equation INTEGER,
  is_equation_solution INTEGER,
  number_of_options INTEGER,
  options TEXT,
  correct_answers TEXT,
  range_from TEXT,
  range_to TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_question_bank_course ON question_bank (course_id);
CREATE INDEX idx_question_bank_subject ON question_bank (subject_id);
CREATE INDEX idx_question_bank_lesson ON question_bank (lesson_id);
CREATE INDEX idx_question_bank_deleted_at ON question_bank (deleted_at);

CREATE TABLE exam_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_no INTEGER,
  mark REAL,
  negative_mark REAL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_exam_questions_exam ON exam_questions (exam_id);
CREATE INDEX idx_exam_questions_question ON exam_questions (question_id);
CREATE INDEX idx_exam_questions_deleted_at ON exam_questions (deleted_at);

CREATE TABLE exam_attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  question_no INTEGER NOT NULL DEFAULT 0,
  question_id TEXT,
  start_time DATETIME,
  end_time DATETIME,
  time_taken TEXT,
  correct INTEGER NOT NULL DEFAULT 0,
  incorrect INTEGER NOT NULL DEFAULT 0,
  skip INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  submit_status INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_exam_attempt_user_exam ON exam_attempt (user_id, exam_id);
CREATE INDEX idx_exam_attempt_submit_status ON exam_attempt (submit_status);
CREATE INDEX idx_exam_attempt_deleted_at ON exam_attempt (deleted_at);

CREATE TABLE exam_answer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer_correct TEXT,
  answer_submitted TEXT,
  answer_status INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_exam_answer_attempt ON exam_answer (attempt_id);
CREATE INDEX idx_exam_answer_user ON exam_answer (user_id);
CREATE INDEX idx_exam_answer_exam_question ON exam_answer (exam_id, question_id);
CREATE INDEX idx_exam_answer_deleted_at ON exam_answer (deleted_at);

CREATE TABLE assignment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  total_marks REAL,
  added_date DATE,
  due_date DATE,
  from_time TEXT,
  to_time TEXT,
  instructions TEXT,
  file TEXT,
  course_id INTEGER,
  cohort_id INTEGER,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_assignment_course ON assignment (course_id);
CREATE INDEX idx_assignment_cohort ON assignment (cohort_id);
CREATE INDEX idx_assignment_due_date ON assignment (due_date);
CREATE INDEX idx_assignment_deleted_at ON assignment (deleted_at);

CREATE TABLE saved_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  assignment_id INTEGER NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_saved_assignments_user ON saved_assignments (user_id);
CREATE INDEX idx_saved_assignments_assignment ON saved_assignments (assignment_id);
CREATE INDEX idx_saved_assignments_deleted_at ON saved_assignments (deleted_at);

CREATE TABLE assignment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cohort_id INTEGER,
  assignment_id INTEGER NOT NULL,
  course_id INTEGER,
  assignment_files TEXT,
  marks TEXT,
  remarks TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_assignment_submissions_user_assignment ON assignment_submissions (user_id, assignment_id);
CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions (assignment_id);
CREATE INDEX idx_assignment_submissions_deleted_at ON assignment_submissions (deleted_at);

CREATE TABLE vimeo_videolinks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_file_id INTEGER NOT NULL,
  quality TEXT,
  rendition TEXT,
  height INTEGER,
  width INTEGER,
  type TEXT,
  link TEXT,
  fps INTEGER,
  size INTEGER,
  public_name TEXT,
  size_short TEXT,
  download_link TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_vimeo_videolinks_lesson_file ON vimeo_videolinks (lesson_file_id);
CREATE INDEX idx_vimeo_videolinks_deleted_at ON vimeo_videolinks (deleted_at);

CREATE TABLE enrol (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  package_id INTEGER,
  batch_id INTEGER,
  enrollment_date DATE,
  enrollment_id TEXT,
  enrollment_status TEXT,
  mode_of_study TEXT,
  preferred_language TEXT,
  pipeline TEXT,
  pipeline_user INTEGER,
  discount_perc REAL,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_enrol_user_course ON enrol (user_id, course_id);
CREATE INDEX idx_enrol_enrollment_id ON enrol (enrollment_id);
CREATE INDEX idx_enrol_deleted_at ON enrol (deleted_at);

CREATE TABLE notification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  course_id INTEGER NOT NULL DEFAULT 0,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_notification_course ON notification (course_id);
CREATE INDEX idx_notification_deleted_at ON notification (deleted_at);

CREATE TABLE notification_read (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  UNIQUE (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notification(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notification_read_deleted_at ON notification_read (deleted_at);

CREATE TABLE support_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);

CREATE INDEX idx_support_chat_chat_sender ON support_chat (chat_id, sender_id);
CREATE INDEX idx_support_chat_deleted_at ON support_chat (deleted_at);

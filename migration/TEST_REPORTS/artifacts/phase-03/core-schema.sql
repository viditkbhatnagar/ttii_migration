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
  password TEXT,
  verification_code TEXT,
  status INTEGER NOT NULL DEFAULT 0,
  device_id TEXT,
  course_id INTEGER,
  notification_token TEXT,
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

CREATE TABLE enrol (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  package_id INTEGER,
  enrollment_date DATE,
  enrollment_status TEXT,
  mode_of_study TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  deleted_by INTEGER,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_enrol_user_course ON enrol (user_id, course_id);
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

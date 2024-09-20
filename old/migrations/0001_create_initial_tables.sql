-- Migration number: 0001 	 2024-05-07T07:57:18.000Z

/** Users
    - First name is the only required field for creating an account
    - There are is no username, accounts are identified by email
    - A user can have multiple emails (hence the user_emails table)
    - There's no soft-delete, all deletion is permanent (here & elsewhere)
    - created_at is a UNIX timestamp i.e. seconds since epoch (here & elsewhere)
*/
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    first_name TEXT NOT NULL CHECK (length(first_name) < 128),
    last_name TEXT CHECK (length(last_name) < 128),
    avatar_url TEXT CHECK (length(avatar_url) < 1024)
);
CREATE INDEX users_created_at_idx ON users(created_at DESC);

/** User Emails 
    - An email is only associated with one user (but a user can have many emails)
    - Email itself is the primary key, for easier user search via email
    - Don't edit the email field, instead add new rows and delete old ones
*/
DROP TABLE IF EXISTS user_emails;
CREATE TABLE user_emails (
    email TEXT PRIMARY KEY NOT NULL CHECK (length(email) < 256),
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX user_emails_user_id_idx ON user_emails(user_id);

/** User Sessions
    - There are no passwords, use email OTP or social auth to verify user identity
    - A unique session token is generated using UUID v4 upon authentication
    - Session token is saved in response cookie, and its SHA256 hash is stored here
    - Session length is configured in the app and tested using the "created_at" field
    - Upon login, delete all expired user session for the authetnicated user
    - On receipt of an expired token, unset cookie & delete all expired sessions for user
    - Upon logout, delete all sessions for user (expired or not - it's a global logout)
*/
DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
    token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) < 256),
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX user_sessions_user_id_idx ON user_sessions(user_id);

/** Admins
    - Users can be made site-wide admins by adding an entry in this table
    - To add course-level admins, use the course_staff table instead
*/
DROP TABLE IF EXISTS admins;
CREATE TABLE admins(
    user_id INTEGER PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

/** Courses
    - Each course must have a unique slug, used in all course-related URLs
    - title, overview, cover_url are used in meta tags and course card lists
    - promo_video, description, and additional info are shown on the course page
    - sort_order is used to reorder courses in course card lists (null appears last)
    - Private course is only visible to enrolled users, unlisted visible only via link
*/ 
DROP TABLE IF EXISTS courses;
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    privacy TEXT CHECK(privacy in ('PRIVATE', 'UNLISTED', 'PUBLIC')) NOT NULL DEFAULT 'PRIVATE',
    slug TEXT NOT NULL UNIQUE CHECK (length(slug) < 128),
    title TEXT NOT NULL CHECK (length(title) < 128),
    overview TEXT CHECK (length(overview) < 256),
    description TEXT CHECK (length(description) < 8192),
    cover_url TEXT CHECK (length(cover_url) < 1024),
    promo_video_url TEXT CHECK (length(promo_video_url) < 1024),
    additional_info TEXT CHECK (length(additional_info) < 16384),
    sort_order INTEGER
);
CREATE INDEX courses_slug_idx ON courses(slug);
CREATE INDEX courses_privacy_idx ON courses(privacy);

/** Course Enrollments
    - One enrollment per (user, course) pair, delete row to unenroll
*/
DROP TABLE IF EXISTS course_enrollments;
CREATE TABLE course_enrollments (
    course_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    PRIMARY KEY (course_id, user_id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX course_enrollments_course_id_created_at_idx ON course_enrollments(course_id, created_at DESC);
CREATE INDEX course_enrollments_user_id_idx ON course_enrollments(user_id);

/** Course Staff
    - Add users to this table to grant course-level admin privileges
    - Mark public and add designation & description to show on course page
*/
DROP TABLE IF EXISTS course_staff;
CREATE TABLE course_staff (
    course_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    privacy TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (privacy in ('PRIVATE', 'PUBLIC')),
    designation TEXT CHECK (length(designation) < 64),
    description TEXT CHECK (length(description) < 1024),
    sort_order INTEGER,
    PRIMARY KEY (course_id, user_id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX course_staff_course_id_idx ON course_staff(course_id);
CREATE INDEX course_staff_user_id_idx ON course_staff(user_id);

/** Course Contents
    - Title & overview are shown on course page and used in meta tags, sorted by sort_order
    - Video and content (markdown rendered as HTML) are shown on lesson/assignment page
    - updated_at doesn't update automatically, it's managed at application level
    - submission_form is JSON array of {name, type, title, description, placeholder, required}
    - Private entry is only visible to course staff, unlisted is only accessibly via direct link
*/ 
DROP TABLE IF EXISTS course_contents;
CREATE TABLE course_contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (updated_at BETWEEN 100000000 AND 99999999999),
    content_type TEXT NOT NULL DEFAULT 'LESSON' CHECK(content_type in ('LESSON', 'ASSIGNMENT')),
    privacy TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (privacy in ('PRIVATE', 'UNLISTED', 'PUBLIC')),
    slug TEXT NOT NULL CHECK (length(slug) < 128),
    title TEXT NOT NULL CHECK (length(title) < 128),
    overview TEXT CHECK (length(overview) < 256),
    content TEXT CHECK (length(content) < 65536),
    video_url TEXT CHECK (length(video_url) < 1024),
    sort_order INTEGER,
    submission_form TEXT CHECK (length(submission_form) < 4096), 
    UNIQUE (course_id, slug),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);
CREATE INDEX course_contents_slug_idx ON course_contents(slug);
CREATE INDEX course_contents_course_id_idx ON course_contents(course_id);

/** Course Content Submissions
    - Used to track submission, grading, and completion of lessons & assignemnts
    - For lesson completion, simply add a new row with 'PASS' grade & empty content
    - For assignment submission, content is JSON object of {[name]: [value]} pairs
    - Assignments are graded as PASS/FAIL (manually or automatically) with feedback
    - Lesson/assignment is "completed" if there's at least some PASS submission
*/
DROP TABLE IF EXISTS course_content_submissions;
CREATE TABLE course_content_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_content_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    content TEXT CHECK (length(content) < 4096),
    grade TEXT CHECK(grade in ('FAIL', 'PASS')),
    feedback TEXT CHECK (length(feedback) < 4096),
    FOREIGN KEY (course_content_id) REFERENCES course_contents(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX course_content_submissions_course_content_created_at_idx ON course_content_submissions(course_content_id, created_at);
CREATE INDEX course_content_submissions_user_id_grade_idx ON course_content_submissions(user_id, grade);

/** Course Certificates
    - Certificate is generated when all lessons & assignments in a course are completed
    - Certificate issuance indicates user has completed course (no other explicit indicator)
    - Certificates arerevoked by deleting rows, a (user, course) pair can have only one certificate
    - Image generated by inserting user's name, course name, certificate id & date into template
*/
DROP TABLE IF EXISTS course_certificates;
CREATE TABLE course_certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) CHECK (created_at BETWEEN 100000000 AND 99999999999),
    image_url TEXT NOT NULL CHECK (length(image_url) < 1024),
    UNIQUE (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);
CREATE INDEX course_certificates_user_id_idx ON course_certificates(user_id);
CREATE INDEX course_certificates_course_id_idx on course_certificates(course_id, created_at);


/*
# Seed interviews and selected_students from existing applications

The seed edge function timed out before creating interviews and selections.
This migration derives them from the existing applications table:
- Shortlisted/selected applications get interview records
- Selected applications get selected_students records
*/

-- ============================================================
-- INTERVIEWS: create for shortlisted & selected applications
-- ============================================================
INSERT INTO interviews (application_id, student_id, company_id, job_post_id, scheduled_at, venue, round, status)
SELECT
  a.id,
  a.student_id,
  jp.company_id,
  a.job_post_id,
  now() + (random() * 14 || ' days')::interval,
  CASE WHEN random() < 0.25 THEN 'Online'
       WHEN random() < 0.5 THEN 'Auditorium A'
       WHEN random() < 0.75 THEN 'Seminar Hall B'
       ELSE 'Placement Cell' END,
  CASE WHEN random() < 0.33 THEN 'Technical'
       WHEN random() < 0.66 THEN 'HR'
       ELSE 'Managerial' END,
  CASE WHEN a.status = 'selected' THEN 'completed'
       ELSE 'scheduled' END
FROM applications a
JOIN job_posts jp ON jp.id = a.job_post_id
WHERE a.status IN ('shortlisted','selected')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SELECTED STUDENTS: create for selected applications
-- ============================================================
INSERT INTO selected_students (student_id, company_id, job_post_id, package_ctc)
SELECT
  a.student_id,
  jp.company_id,
  a.job_post_id,
  jp.package_ctc
FROM applications a
JOIN job_posts jp ON jp.id = a.job_post_id
WHERE a.status = 'selected'
ON CONFLICT (student_id, company_id, job_post_id) DO NOTHING;

-- ============================================================
-- NOTIFICATIONS: welcome notifications for all users
-- ============================================================
INSERT INTO notifications (user_id, title, message)
SELECT user_id, 'Welcome to CPMS', 'Your account is ready. Explore placement drives and opportunities.'
FROM user_profiles
ON CONFLICT DO NOTHING;

SELECT
  (SELECT COUNT(*) FROM interviews) AS interviews_created,
  (SELECT COUNT(*) FROM selected_students) AS selected_created,
  (SELECT COUNT(*) FROM notifications) AS notifications_created;
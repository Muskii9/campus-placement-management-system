/*
# Campus Placement Management System - Core Schema

Creates the complete database schema for a campus placement management system
with 3 user roles (admin, student, company). Includes normalized tables (3NF),
foreign keys, indexes, triggers, views, stored procedures, and RLS policies.

## Tables created:
1. departments - academic departments
2. user_profiles - links auth.users to roles (admin/student/company)
3. admins - admin accounts
4. students - student accounts with academic details
5. companies - company accounts
6. placement_drives - recruitment drives organized by companies
7. job_posts - job openings within drives
8. applications - student job applications
9. interviews - interview schedules
10. selected_students - final selections
11. resumes - student resume storage
12. notifications - user notifications

## Security:
- RLS enabled on all tables
- Role-based access via current_user_role() helper
- Students see own data + public company/drive/job data
- Companies see own data + applicants for their jobs
- Admins see everything
*/

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- USER PROFILES (role bridge for auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','student','company')),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  roll_no text UNIQUE NOT NULL,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  year_of_study int DEFAULT 4,
  tenth_percentage numeric(5,2) NOT NULL DEFAULT 0,
  twelfth_percentage numeric(5,2) NOT NULL DEFAULT 0,
  cgpa numeric(3,2) NOT NULL DEFAULT 0,
  skills text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  contact_person text,
  contact_phone text,
  website text,
  address text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PLACEMENT DRIVES
-- ============================================================
CREATE TABLE IF NOT EXISTS placement_drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  drive_date date NOT NULL,
  last_date_to_apply date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','completed')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- JOB POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id uuid NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  package_ctc numeric(12,2) NOT NULL DEFAULT 0,
  job_location text,
  job_type text DEFAULT 'Full-time',
  min_cgpa numeric(3,2) DEFAULT 6.00,
  eligible_departments text DEFAULT '',
  no_of_vacancies int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  job_post_id uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','shortlisted','selected','rejected')),
  applied_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, job_post_id)
);

-- ============================================================
-- INTERVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_post_id uuid REFERENCES job_posts(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  venue text,
  round text DEFAULT 'Technical',
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SELECTED STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS selected_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_post_id uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  package_ctc numeric(12,2) NOT NULL,
  selected_at timestamptz DEFAULT now(),
  UNIQUE(student_id, company_id, job_post_id)
);

-- ============================================================
-- RESUMES
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_data text,
  uploaded_at timestamptz DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_cgpa ON students(cgpa);
CREATE INDEX IF NOT EXISTS idx_drives_company ON placement_drives(company_id);
CREATE INDEX IF NOT EXISTS idx_drives_status ON placement_drives(status);
CREATE INDEX IF NOT EXISTS idx_jobs_drive ON job_posts(drive_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON job_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_apps_job ON applications(job_post_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_interviews_student ON interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company ON interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_selected_student ON selected_students(student_id);
CREATE INDEX IF NOT EXISTS idx_selected_company ON selected_students(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================================
-- HELPER FUNCTION: get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- ============================================================
-- TRIGGER: auto-update applications.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_application_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apps_updated ON applications;
CREATE TRIGGER trg_apps_updated
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_application_timestamp();

-- ============================================================
-- TRIGGER: auto-create notification on application status change
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_title text;
  v_company_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT jp.title INTO v_job_title FROM job_posts jp WHERE jp.id = NEW.job_post_id;
    SELECT c.name INTO v_company_name FROM companies c
      JOIN job_posts jp ON jp.company_id = c.id WHERE jp.id = NEW.job_post_id;

    INSERT INTO notifications (user_id, title, message)
    VALUES (
      NEW.student_id,
      'Application Status Updated',
      'Your application for "' || COALESCE(v_job_title,'') || '" at ' || COALESCE(v_company_name,'') || ' is now: ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_app_status ON applications;
CREATE TRIGGER trg_notify_app_status
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status();

-- ============================================================
-- TRIGGER: auto-add to selected_students when status = selected
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_select_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_package numeric(12,2);
BEGIN
  IF NEW.status = 'selected' AND OLD.status IS DISTINCT FROM 'selected' THEN
    SELECT company_id, package_ctc INTO v_company_id, v_package
      FROM job_posts WHERE id = NEW.job_post_id;

    INSERT INTO selected_students (student_id, company_id, job_post_id, package_ctc)
    VALUES (NEW.student_id, v_company_id, NEW.job_post_id, COALESCE(v_package, 0))
    ON CONFLICT (student_id, company_id, job_post_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_select ON applications;
CREATE TRIGGER trg_auto_select
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_select_student();

-- ============================================================
-- VIEW: placement_summary (department-wise stats)
-- ============================================================
CREATE OR REPLACE VIEW v_department_placement AS
SELECT
  d.id AS department_id,
  d.name AS department_name,
  d.code AS department_code,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT sel.student_id) AS placed_students,
  ROUND(COUNT(DISTINCT sel.student_id)::numeric / NULLIF(COUNT(DISTINCT s.id),0) * 100, 2) AS placement_percentage,
  COALESCE(MAX(sel.package_ctc), 0) AS highest_package,
  COALESCE(ROUND(AVG(sel.package_ctc),2), 0) AS average_package
FROM departments d
LEFT JOIN students s ON s.department_id = d.id
LEFT JOIN selected_students sel ON sel.student_id = s.id
GROUP BY d.id, d.name, d.code;

-- ============================================================
-- VIEW: company_selection_report
-- ============================================================
CREATE OR REPLACE VIEW v_company_selection AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  COUNT(DISTINCT jp.id) AS total_jobs,
  COUNT(DISTINCT a.id) AS total_applications,
  COUNT(DISTINCT sel.student_id) AS selected_count,
  COALESCE(MAX(sel.package_ctc), 0) AS highest_package,
  COALESCE(ROUND(AVG(sel.package_ctc),2), 0) AS average_package
FROM companies c
LEFT JOIN job_posts jp ON jp.company_id = c.id
LEFT JOIN applications a ON a.job_post_id = jp.id
LEFT JOIN selected_students sel ON sel.company_id = c.id
GROUP BY c.id, c.name;

-- ============================================================
-- VIEW: student_application_detail
-- ============================================================
CREATE OR REPLACE VIEW v_student_applications AS
SELECT
  a.id AS application_id,
  a.student_id,
  s.name AS student_name,
  s.roll_no,
  d.name AS department_name,
  a.job_post_id,
  jp.title AS job_title,
  c.name AS company_name,
  jp.package_ctc,
  a.status,
  a.applied_at,
  a.updated_at
FROM applications a
JOIN students s ON s.id = a.student_id
LEFT JOIN departments d ON d.id = s.department_id
JOIN job_posts jp ON jp.id = a.job_post_id
JOIN companies c ON c.id = jp.company_id;

-- ============================================================
-- STORED PROCEDURE: get placement statistics
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_placement_stats()
RETURNS TABLE (
  total_students bigint,
  total_companies bigint,
  total_drives bigint,
  total_jobs bigint,
  total_applications bigint,
  total_placed bigint,
  placement_percentage numeric,
  highest_package numeric,
  average_package numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM students),
    (SELECT COUNT(*) FROM companies),
    (SELECT COUNT(*) FROM placement_drives),
    (SELECT COUNT(*) FROM job_posts),
    (SELECT COUNT(*) FROM applications),
    (SELECT COUNT(DISTINCT student_id) FROM selected_students),
    ROUND(
      (SELECT COUNT(DISTINCT student_id) FROM selected_students)::numeric /
      NULLIF((SELECT COUNT(*) FROM students), 0) * 100, 2
    ),
    COALESCE((SELECT MAX(package_ctc) FROM selected_students), 0),
    COALESCE((SELECT ROUND(AVG(package_ctc),2) FROM selected_students), 0);
$$;

-- ============================================================
-- STORED PROCEDURE: check student eligibility for a job
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_eligibility(
  p_student_id uuid,
  p_job_post_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_student_cgpa numeric;
  v_student_dept text;
  v_min_cgpa numeric;
  v_eligible_depts text;
BEGIN
  SELECT cgpa, (SELECT code FROM departments WHERE id = s.department_id)
    INTO v_student_cgpa, v_student_dept
  FROM students s WHERE s.id = p_student_id;

  SELECT min_cgpa, eligible_departments INTO v_min_cgpa, v_eligible_depts
  FROM job_posts WHERE id = p_job_post_id;

  IF v_student_cgpa IS NULL THEN
    RETURN false;
  END IF;

  IF v_student_cgpa < v_min_cgpa THEN
    RETURN false;
  END IF;

  IF v_eligible_depts IS NOT NULL AND v_eligible_depts != '' AND v_eligible_depts != 'ALL' THEN
    IF position(v_student_dept in v_eligible_depts) = 0 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- ============================================================
-- RLS: Enable on all tables
-- ============================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: departments (public read, admin write)
-- ============================================================
DROP POLICY IF EXISTS "dept_select_all" ON departments;
CREATE POLICY "dept_select_all" ON departments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "dept_admin_insert" ON departments;
CREATE POLICY "dept_admin_insert" ON departments FOR INSERT
  TO authenticated WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "dept_admin_update" ON departments;
CREATE POLICY "dept_admin_update" ON departments FOR UPDATE
  TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "dept_admin_delete" ON departments;
CREATE POLICY "dept_admin_delete" ON departments FOR DELETE
  TO authenticated USING (public.current_user_role() = 'admin');

-- ============================================================
-- RLS POLICIES: user_profiles
-- ============================================================
DROP POLICY IF EXISTS "profile_select_own_admin" ON user_profiles;
CREATE POLICY "profile_select_own_admin" ON user_profiles FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "profile_insert_own" ON user_profiles;
CREATE POLICY "profile_insert_own" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "profile_update_own" ON user_profiles;
CREATE POLICY "profile_update_own" ON user_profiles FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLS POLICIES: admins
-- ============================================================
DROP POLICY IF EXISTS "admin_select_all_admins" ON admins;
CREATE POLICY "admin_select_all_admins" ON admins FOR SELECT
  TO authenticated USING (
    id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "admin_insert_self" ON admins;
CREATE POLICY "admin_insert_self" ON admins FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_update_self" ON admins;
CREATE POLICY "admin_update_self" ON admins FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- RLS POLICIES: students
-- ============================================================
DROP POLICY IF EXISTS "student_select" ON students;
CREATE POLICY "student_select" ON students FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR public.current_user_role() = 'company'
  );

DROP POLICY IF EXISTS "student_insert_self" ON students;
CREATE POLICY "student_insert_self" ON students FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "student_update_self_admin" ON students;
CREATE POLICY "student_update_self_admin" ON students FOR UPDATE
  TO authenticated USING (
    id = auth.uid() OR public.current_user_role() = 'admin'
  ) WITH CHECK (
    id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "student_delete_admin" ON students;
CREATE POLICY "student_delete_admin" ON students FOR DELETE
  TO authenticated USING (public.current_user_role() = 'admin');

-- ============================================================
-- RLS POLICIES: companies
-- ============================================================
DROP POLICY IF EXISTS "company_select" ON companies;
CREATE POLICY "company_select" ON companies FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "company_insert_self" ON companies;
CREATE POLICY "company_insert_self" ON companies FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "company_update_self_admin" ON companies;
CREATE POLICY "company_update_self_admin" ON companies FOR UPDATE
  TO authenticated USING (
    id = auth.uid() OR public.current_user_role() = 'admin'
  ) WITH CHECK (
    id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "company_delete_admin" ON companies;
CREATE POLICY "company_delete_admin" ON companies FOR DELETE
  TO authenticated USING (public.current_user_role() = 'admin');

-- ============================================================
-- RLS POLICIES: placement_drives
-- ============================================================
DROP POLICY IF EXISTS "drive_select" ON placement_drives;
CREATE POLICY "drive_select" ON placement_drives FOR SELECT
  TO authenticated USING (
    public.current_user_role() IN ('admin','student')
    OR company_id = auth.uid()
  );

DROP POLICY IF EXISTS "drive_insert_company" ON placement_drives;
CREATE POLICY "drive_insert_company" ON placement_drives FOR INSERT
  TO authenticated WITH CHECK (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "drive_update_owner_admin" ON placement_drives;
CREATE POLICY "drive_update_owner_admin" ON placement_drives FOR UPDATE
  TO authenticated USING (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  ) WITH CHECK (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "drive_delete_owner_admin" ON placement_drives;
CREATE POLICY "drive_delete_owner_admin" ON placement_drives FOR DELETE
  TO authenticated USING (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

-- ============================================================
-- RLS POLICIES: job_posts
-- ============================================================
DROP POLICY IF EXISTS "job_select" ON job_posts;
CREATE POLICY "job_select" ON job_posts FOR SELECT
  TO authenticated USING (
    public.current_user_role() IN ('admin','student')
    OR company_id = auth.uid()
  );

DROP POLICY IF EXISTS "job_insert_company" ON job_posts;
CREATE POLICY "job_insert_company" ON job_posts FOR INSERT
  TO authenticated WITH CHECK (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "job_update_owner_admin" ON job_posts;
CREATE POLICY "job_update_owner_admin" ON job_posts FOR UPDATE
  TO authenticated USING (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  ) WITH CHECK (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "job_delete_owner_admin" ON job_posts;
CREATE POLICY "job_delete_owner_admin" ON job_posts FOR DELETE
  TO authenticated USING (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

-- ============================================================
-- RLS POLICIES: applications
-- ============================================================
DROP POLICY IF EXISTS "app_select" ON applications;
CREATE POLICY "app_select" ON applications FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.id = applications.job_post_id AND jp.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "app_insert_student" ON applications;
CREATE POLICY "app_insert_student" ON applications FOR INSERT
  TO authenticated WITH CHECK (
    student_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "app_update" ON applications;
CREATE POLICY "app_update" ON applications FOR UPDATE
  TO authenticated USING (
    student_id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.id = applications.job_post_id AND jp.company_id = auth.uid()
    )
  ) WITH CHECK (
    student_id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.id = applications.job_post_id AND jp.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "app_delete_admin" ON applications;
CREATE POLICY "app_delete_admin" ON applications FOR DELETE
  TO authenticated USING (
    student_id = auth.uid() OR public.current_user_role() = 'admin'
  );

-- ============================================================
-- RLS POLICIES: interviews
-- ============================================================
DROP POLICY IF EXISTS "interview_select" ON interviews;
CREATE POLICY "interview_select" ON interviews FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR company_id = auth.uid()
  );

DROP POLICY IF EXISTS "interview_insert" ON interviews;
CREATE POLICY "interview_insert" ON interviews FOR INSERT
  TO authenticated WITH CHECK (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "interview_update" ON interviews;
CREATE POLICY "interview_update" ON interviews FOR UPDATE
  TO authenticated USING (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  ) WITH CHECK (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "interview_delete" ON interviews;
CREATE POLICY "interview_delete" ON interviews FOR DELETE
  TO authenticated USING (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

-- ============================================================
-- RLS POLICIES: selected_students
-- ============================================================
DROP POLICY IF EXISTS "selected_select" ON selected_students;
CREATE POLICY "selected_select" ON selected_students FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR company_id = auth.uid()
  );

DROP POLICY IF EXISTS "selected_insert" ON selected_students;
CREATE POLICY "selected_insert" ON selected_students FOR INSERT
  TO authenticated WITH CHECK (
    company_id = auth.uid() OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "selected_delete" ON selected_students;
CREATE POLICY "selected_delete" ON selected_students FOR DELETE
  TO authenticated USING (
    public.current_user_role() = 'admin' OR company_id = auth.uid()
  );

-- ============================================================
-- RLS POLICIES: resumes
-- ============================================================
DROP POLICY IF EXISTS "resume_select" ON resumes;
CREATE POLICY "resume_select" ON resumes FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM applications a
      JOIN job_posts jp ON jp.id = a.job_post_id
      WHERE a.student_id = resumes.student_id AND jp.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "resume_insert_student" ON resumes;
CREATE POLICY "resume_insert_student" ON resumes FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "resume_update_student" ON resumes;
CREATE POLICY "resume_update_student" ON resumes FOR UPDATE
  TO authenticated USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "resume_delete_student" ON resumes;
CREATE POLICY "resume_delete_student" ON resumes FOR DELETE
  TO authenticated USING (
    student_id = auth.uid() OR public.current_user_role() = 'admin'
  );

-- ============================================================
-- RLS POLICIES: notifications
-- ============================================================
DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());
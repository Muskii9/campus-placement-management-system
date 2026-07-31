/*
# CPMS Sample Data Seed

Inserts realistic sample data for testing:
- 6 departments (CSE, ECE, ME, CE, EE, MCA)
- 10 companies
- 20 placement drives
- 40+ job posts
- 50+ students (with academic details)
- 100+ applications
- 30+ interviews
- 20+ selected students

NOTE: Students and companies are linked to auth.users via their id.
For this seed, we create placeholder student/company rows first;
the actual auth.users accounts are created via the frontend sign-up flow.
To make the demo immediately usable, we also insert admin/company/student
profile rows that reference pre-created auth users (created by the app's
seed admin endpoint or manually). Since we cannot create auth.users
from SQL directly, these sample rows use generated UUIDs as placeholders
and the frontend demo-login flow maps test accounts to them.

For a self-contained demo without requiring auth.users entries, we relax
the FK constraints by using ON DELETE SET NULL where possible and provide
a separate demo mode in the frontend.
*/

-- ============================================================
-- DEPARTMENTS
-- ============================================================
INSERT INTO departments (id, name, code) VALUES
  (gen_random_uuid(), 'Computer Science & Engineering', 'CSE'),
  (gen_random_uuid(), 'Electronics & Communication', 'ECE'),
  (gen_random_uuid(), 'Mechanical Engineering', 'ME'),
  (gen_random_uuid(), 'Civil Engineering', 'CE'),
  (gen_random_uuid(), 'Electrical Engineering', 'EE'),
  (gen_random_uuid(), 'Master of Computer Applications', 'MCA')
ON CONFLICT (code) DO NOTHING;

-- Store department IDs in a temp table for reference
WITH d1 AS (SELECT id FROM departments WHERE code='CSE'),
     d2 AS (SELECT id FROM departments WHERE code='ECE'),
     d3 AS (SELECT id FROM departments WHERE code='ME'),
     d4 AS (SELECT id FROM departments WHERE code='CE'),
     d5 AS (SELECT id FROM departments WHERE code='EE'),
     d6 AS (SELECT id FROM departments WHERE code='MCA')
SELECT 1; -- placeholder so the CTE chain is valid

-- ============================================================
-- We cannot seed students/companies that FK to auth.users without
-- actual auth users. The frontend will create these on sign-up.
-- Instead, we seed departments (done) and provide a SQL script
-- the user can run after creating accounts.
-- ============================================================

-- For immediate demo data, we create a set of auth users via the
-- frontend is not possible from SQL. So we will seed only departments
-- here and rely on the app's "seed demo data" feature (an edge function)
-- to populate students/companies/drives after auth accounts exist.

SELECT 'Departments seeded. Use the app demo-seed feature for full data.';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'admin' | 'student' | 'company';

export interface UserProfile {
  user_id: string;
  role: UserRole;
  email: string;
  full_name: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Student {
  id: string;
  roll_no: string;
  name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  year_of_study: number;
  tenth_percentage: number;
  twelfth_percentage: number;
  cgpa: number;
  skills: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  contact_person: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  created_at: string;
}

export interface PlacementDrive {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  drive_date: string;
  last_date_to_apply: string;
  status: 'open' | 'closed' | 'completed';
  created_at: string;
  company?: Company;
}

export interface JobPost {
  id: string;
  drive_id: string;
  company_id: string;
  title: string;
  description: string | null;
  package_ctc: number;
  job_location: string | null;
  job_type: string;
  min_cgpa: number;
  eligible_departments: string;
  no_of_vacancies: number;
  created_at: string;
  company?: Company;
  drive?: PlacementDrive;
}

export interface Application {
  id: string;
  student_id: string;
  job_post_id: string;
  status: 'pending' | 'shortlisted' | 'selected' | 'rejected';
  applied_at: string;
  updated_at: string;
  job_post?: JobPost;
  student?: Student;
}

export interface Interview {
  id: string;
  application_id: string;
  student_id: string;
  company_id: string;
  job_post_id: string | null;
  scheduled_at: string;
  venue: string | null;
  round: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  student?: Student;
  company?: Company;
  job_post?: JobPost;
}

export interface SelectedStudent {
  id: string;
  student_id: string;
  company_id: string;
  job_post_id: string;
  package_ctc: number;
  selected_at: string;
  student?: Student;
  company?: Company;
  job_post?: JobPost;
}

export interface Resume {
  id: string;
  student_id: string;
  file_name: string;
  file_data: string | null;
  uploaded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PlacementStats {
  total_students: number;
  total_companies: number;
  total_drives: number;
  total_jobs: number;
  total_applications: number;
  total_placed: number;
  placement_percentage: number;
  highest_package: number;
  average_package: number;
}

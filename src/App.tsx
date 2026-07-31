import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthPage } from '@/components/AuthPage';
import { AppLayout } from '@/components/AppLayout';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ManageStudents } from '@/components/admin/ManageStudents';
import { ManageCompanies } from '@/components/admin/ManageCompanies';
import { ManageDrives } from '@/components/admin/ManageDrives';
import { AdminReports } from '@/components/admin/AdminReports';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { StudentProfile } from '@/components/student/StudentProfile';
import { BrowseJobs } from '@/components/student/BrowseJobs';
import { MyApplications } from '@/components/student/MyApplications';
import { CompanyDashboard } from '@/components/company/CompanyDashboard';
import { ManageDrivesJobs } from '@/components/company/ManageDrivesJobs';
import { ViewApplicants } from '@/components/company/ViewApplicants';
import { CompanyProfile } from '@/components/company/CompanyProfile';
import { LayoutDashboard, Users, Building2, Briefcase, FileText, BarChart3, User } from 'lucide-react';
import type { ReactNode } from 'react';

function AppContent() {
  const { user, role, loading } = useAuth();
  const [view, setView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!user || !role) {
    return <AuthPage />;
  }

  const navItems: { key: string; label: string; icon: ReactNode }[] = [];

  if (role === 'admin') {
    navItems.push(
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { key: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
      { key: 'companies', label: 'Companies', icon: <Building2 className="w-4 h-4" /> },
      { key: 'drives', label: 'Drives & Jobs', icon: <Briefcase className="w-4 h-4" /> },
      { key: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    );
  } else if (role === 'student') {
    navItems.push(
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { key: 'jobs', label: 'Browse Jobs', icon: <Briefcase className="w-4 h-4" /> },
      { key: 'applications', label: 'Applications', icon: <FileText className="w-4 h-4" /> },
      { key: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    );
  } else if (role === 'company') {
    navItems.push(
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { key: 'drives', label: 'Drives & Jobs', icon: <Briefcase className="w-4 h-4" /> },
      { key: 'applicants', label: 'Applicants', icon: <Users className="w-4 h-4" /> },
      { key: 'profile', label: 'Company Profile', icon: <Building2 className="w-4 h-4" /> },
    );
  }

  let content: ReactNode = null;
  if (role === 'admin') {
    switch (view) {
      case 'dashboard': content = <AdminDashboard />; break;
      case 'students': content = <ManageStudents />; break;
      case 'companies': content = <ManageCompanies />; break;
      case 'drives': content = <ManageDrives />; break;
      case 'reports': content = <AdminReports />; break;
      default: content = <AdminDashboard />;
    }
  } else if (role === 'student') {
    switch (view) {
      case 'dashboard': content = <StudentDashboard />; break;
      case 'jobs': content = <BrowseJobs />; break;
      case 'applications': content = <MyApplications />; break;
      case 'profile': content = <StudentProfile />; break;
      default: content = <StudentDashboard />;
    }
  } else if (role === 'company') {
    switch (view) {
      case 'dashboard': content = <CompanyDashboard />; break;
      case 'drives': content = <ManageDrivesJobs />; break;
      case 'applicants': content = <ViewApplicants />; break;
      case 'profile': content = <CompanyProfile />; break;
      default: content = <CompanyDashboard />;
    }
  }

  return (
    <AppLayout currentView={view} onNavigate={setView} navItems={navItems}>
      {content}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

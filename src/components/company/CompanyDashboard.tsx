import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type PlacementDrive, type JobPost, type Application } from '@/lib/supabase';
import { Card, CardBody, Badge, EmptyState } from '@/components/ui/Primitives';
import { formatINR, formatDate, statusColor } from '@/lib/utils';
import { Briefcase, FileText, Users, Award } from 'lucide-react';

export function CompanyDashboard() {
  const { user } = useAuth();
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [appCount, setAppCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: d } = await supabase.from('placement_drives').select('*').eq('company_id', user.id).order('drive_date', { ascending: false });
    if (d) setDrives(d as PlacementDrive[]);

    const { data: j } = await supabase.from('job_posts').select('*').eq('company_id', user.id).order('created_at', { ascending: false });
    if (j) setJobs(j as JobPost[]);

    const jobIds = (j ?? []).map((job) => job.id);
    if (jobIds.length > 0) {
      const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true }).in('job_post_id', jobIds);
      setAppCount(count ?? 0);
    }

    const { count: selCount } = await supabase.from('selected_students').select('*', { count: 'exact', head: true }).eq('company_id', user.id);
    setSelectedCount(selCount ?? 0);

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  const stats = [
    { label: 'Placement Drives', value: drives.length, icon: <Briefcase className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Job Posts', value: jobs.length, icon: <FileText className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Applicants', value: appCount, icon: <Users className="w-5 h-5" />, color: 'bg-violet-50 text-violet-600' },
    { label: 'Students Selected', value: selectedCount, icon: <Award className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your recruitment activities</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex flex-col gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Recent Drives</h3></div>
          {drives.length === 0 ? (
            <EmptyState icon={<Briefcase className="w-6 h-6" />} title="No drives yet" message="Create a placement drive to get started" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Drive</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Last Date</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drives.slice(0, 5).map((d) => (
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-800">{d.title}</td>
                      <td className="px-6 py-3 text-slate-600">{formatDate(d.drive_date)}</td>
                      <td className="px-6 py-3 text-slate-600">{formatDate(d.last_date_to_apply)}</td>
                      <td className="px-6 py-3"><Badge className={statusColor(d.status)}>{d.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Active Job Posts</h3></div>
          {jobs.length === 0 ? (
            <EmptyState icon={<FileText className="w-6 h-6" />} title="No jobs posted" message="Post a job to start receiving applications" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Title</th>
                    <th className="px-6 py-3 font-medium">Package</th>
                    <th className="px-6 py-3 font-medium">Location</th>
                    <th className="px-6 py-3 font-medium">Min CGPA</th>
                    <th className="px-6 py-3 font-medium">Vacancies</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.slice(0, 5).map((j) => (
                    <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-800">{j.title}</td>
                      <td className="px-6 py-3"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(j.package_ctc)}</Badge></td>
                      <td className="px-6 py-3 text-slate-600">{j.job_location ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{j.min_cgpa}</td>
                      <td className="px-6 py-3 text-slate-600">{j.no_of_vacancies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

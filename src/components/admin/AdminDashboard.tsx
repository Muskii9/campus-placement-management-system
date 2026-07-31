import { useEffect, useState } from 'react';
import { supabase, type PlacementStats, type Student, type Company, type JobPost } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Badge, Button } from '@/components/ui/Primitives';
import { formatINR } from '@/lib/utils';
import { Users, Building2, Briefcase, TrendingUp, Award, FileText, Download } from 'lucide-react';
import { downloadCSV } from '@/lib/utils';

export function AdminDashboard() {
  const [stats, setStats] = useState<PlacementStats | null>(null);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [recentCompanies, setRecentCompanies] = useState<Company[]>([]);
  const [topJobs, setTopJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: statsData } = await supabase.rpc('get_placement_stats');
      setStats(statsData as PlacementStats);

      const { data: students } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (students) setRecentStudents(students as Student[]);

      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (companies) setRecentCompanies(companies as Company[]);

      const { data: jobs } = await supabase
        .from('job_posts')
        .select('*, company:companies(*)')
        .order('package_ctc', { ascending: false })
        .limit(5);
      if (jobs) setTopJobs(jobs as JobPost[]);

      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  const statCards = [
    { label: 'Total Students', value: stats.total_students, icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Companies', value: stats.total_companies, icon: <Building2 className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Placement Drives', value: stats.total_drives, icon: <Briefcase className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Job Posts', value: stats.total_jobs, icon: <FileText className="w-5 h-5" />, color: 'bg-violet-50 text-violet-600' },
    { label: 'Applications', value: stats.total_applications, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-rose-50 text-rose-600' },
    { label: 'Students Placed', value: stats.total_placed, icon: <Award className="w-5 h-5" />, color: 'bg-teal-50 text-teal-600' },
  ];

  const exportStats = () => {
    downloadCSV('placement_stats.csv', [{
      total_students: stats.total_students,
      total_companies: stats.total_companies,
      total_drives: stats.total_drives,
      total_jobs: stats.total_jobs,
      total_applications: stats.total_applications,
      total_placed: stats.total_placed,
      placement_percentage: stats.placement_percentage,
      highest_package: stats.highest_package,
      average_package: stats.average_package,
    }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of placement activities</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportStats}>
          <Download className="w-4 h-4 mr-1.5" /> Export Stats
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex flex-col gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Placement summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 mb-1">Placement Percentage</p>
            <p className="text-3xl font-bold text-slate-900">{stats.placement_percentage}%</p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(stats.placement_percentage, 100)}%` }} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 mb-1">Highest Package</p>
            <p className="text-3xl font-bold text-slate-900">{formatINR(stats.highest_package)}</p>
            <p className="text-xs text-emerald-600 mt-2">per annum</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 mb-1">Average Package</p>
            <p className="text-3xl font-bold text-slate-900">{formatINR(stats.average_package)}</p>
            <p className="text-xs text-slate-500 mt-2">per annum</p>
          </CardBody>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Recent Students</h3>
          </CardHeader>
          <CardBody className="space-y-2">
            {recentStudents.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No students yet</p>
            ) : (
              recentStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.roll_no} • CGPA {s.cgpa}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Top Packages</h3>
          </CardHeader>
          <CardBody className="space-y-2">
            {topJobs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No jobs yet</p>
            ) : (
              topJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{j.title}</p>
                    <p className="text-xs text-slate-500">{j.company?.name}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(j.package_ctc)}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Recent Companies</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {recentCompanies.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-semibold">
                  {c.name.charAt(0)}
                </div>
                <p className="text-sm font-medium text-slate-800 text-center">{c.name}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

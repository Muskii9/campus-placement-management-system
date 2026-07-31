import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Student, type Application, type Interview, type JobPost, type Department } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Badge, Button, EmptyState } from '@/components/ui/Primitives';
import { formatINR, formatDate, formatDateTime, statusColor } from '@/lib/utils';
import { GraduationCap, Briefcase, TrendingUp, Award, Calendar, FileText, CheckCircle } from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selection, setSelection] = useState<{ count: number; package: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: s } = await supabase.from('students').select('*').eq('id', user.id).maybeSingle();
    if (s) {
      setStudent(s as Student);
      if ((s as Student).department_id) {
        const { data: d } = await supabase.from('departments').select('*').eq('id', (s as Student).department_id!).maybeSingle();
        if (d) setDepartment(d as Department);
      }
    }
    const { data: apps } = await supabase
      .from('applications')
      .select('*, job_post:job_posts(*, company:companies(*))')
      .eq('student_id', user.id)
      .order('applied_at', { ascending: false });
    if (apps) setApplications(apps as Application[]);

    const { data: ints } = await supabase
      .from('interviews')
      .select('*, company:companies(*), job_post:job_posts(*)')
      .eq('student_id', user.id)
      .order('scheduled_at', { ascending: true });
    if (ints) setInterviews(ints as Interview[]);

    const { data: sel } = await supabase
      .from('selected_students')
      .select('package_ctc')
      .eq('student_id', user.id);
    if (sel && sel.length > 0) {
      setSelection({
        count: sel.length,
        package: Math.max(...sel.map((s) => s.package_ctc)),
      });
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  const stats = [
    { label: 'Applications', value: applications.length, icon: <FileText className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Shortlisted', value: applications.filter((a) => a.status === 'shortlisted').length, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Interviews', value: interviews.filter((i) => i.status === 'scheduled').length, icon: <Calendar className="w-5 h-5" />, color: 'bg-violet-50 text-violet-600' },
    { label: 'Offers', value: selection?.count ?? 0, icon: <Award className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {student?.name ?? 'Student'}</h1>
        <p className="text-sm text-slate-500 mt-1">{student?.roll_no} • {department?.name ?? '—'} • CGPA {student?.cgpa}</p>
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

      {selection && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Congratulations! You have been placed!</p>
              <p className="text-sm text-emerald-700">Highest package: {formatINR(selection.package)} per annum</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">Recent Applications</h3></CardHeader>
          <CardBody className="space-y-2">
            {applications.length === 0 ? (
              <EmptyState icon={<Briefcase className="w-6 h-6" />} title="No applications yet" message="Browse jobs to apply" />
            ) : (
              applications.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{a.job_post?.title}</p>
                    <p className="text-xs text-slate-500">{a.job_post?.company?.name} • {formatINR(a.job_post?.package_ctc ?? 0)}</p>
                  </div>
                  <Badge className={statusColor(a.status)}>{a.status}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">Upcoming Interviews</h3></CardHeader>
          <CardBody className="space-y-2">
            {interviews.filter((i) => i.status === 'scheduled').length === 0 ? (
              <EmptyState icon={<Calendar className="w-6 h-6" />} title="No interviews scheduled" message="Check back later" />
            ) : (
              interviews.filter((i) => i.status === 'scheduled').slice(0, 5).map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{i.company?.name}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(i.scheduled_at)} • {i.venue}</p>
                  </div>
                  <Badge className={statusColor(i.round)}>{i.round}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

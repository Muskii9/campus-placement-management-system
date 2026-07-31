import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Application, type Interview } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Badge, EmptyState, Pagination } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { FileText, Calendar, Briefcase } from 'lucide-react';
import { formatINR, formatDate, formatDateTime, statusColor, paginate } from '@/lib/utils';

const PER_PAGE = 10;

export function MyApplications() {
  const { user } = useAuth();
  const toast = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'apps' | 'interviews'>('apps');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: apps, error } = await supabase
      .from('applications')
      .select('*, job_post:job_posts(*, company:companies(*))')
      .eq('student_id', user.id)
      .order('applied_at', { ascending: false });
    if (error) toast('Failed to load applications: ' + error.message, 'error');
    else setApplications(apps as Application[]);

    const { data: ints } = await supabase
      .from('interviews')
      .select('*, company:companies(*), job_post:job_posts(*)')
      .eq('student_id', user.id)
      .order('scheduled_at', { ascending: false });
    if (ints) setInterviews(ints as Interview[]);
    setLoading(false);
  }, [user?.id, toast]);

  useEffect(() => { load(); }, [load]);

  const activeList = tab === 'apps' ? applications : interviews;
  const totalPages = Math.ceil(activeList.length / PER_PAGE);
  const pagedApps = paginate(applications, page, PER_PAGE) as Application[];
  const pagedInterviews = paginate(interviews, page, PER_PAGE) as Interview[];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Applications & Interviews</h1>
        <p className="text-sm text-slate-500 mt-1">Track your application status and interview schedules</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button onClick={() => { setTab('apps'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'apps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
          Applications ({applications.length})
        </button>
        <button onClick={() => { setTab('interviews'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'interviews' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
          Interviews ({interviews.length})
        </button>
      </div>

      <Card>
        <CardBody className="p-0">
          {tab === 'apps' ? (
            pagedApps.length === 0 ? (
              <EmptyState icon={<FileText className="w-6 h-6" />} title="No applications yet" message="Browse jobs and apply to get started" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-6 py-3 font-medium">Job Title</th>
                      <th className="px-6 py-3 font-medium">Company</th>
                      <th className="px-6 py-3 font-medium">Package</th>
                      <th className="px-6 py-3 font-medium">Applied On</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedApps.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{a.job_post?.title}</td>
                        <td className="px-6 py-3 text-slate-600">{a.job_post?.company?.name}</td>
                        <td className="px-6 py-3"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(a.job_post?.package_ctc ?? 0)}</Badge></td>
                        <td className="px-6 py-3 text-slate-600">{formatDate(a.applied_at)}</td>
                        <td className="px-6 py-3"><Badge className={statusColor(a.status)}>{a.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            pagedInterviews.length === 0 ? (
              <EmptyState icon={<Calendar className="w-6 h-6" />} title="No interviews scheduled" message="Interview invitations will appear here" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-6 py-3 font-medium">Company</th>
                      <th className="px-6 py-3 font-medium">Round</th>
                      <th className="px-6 py-3 font-medium">Schedule</th>
                      <th className="px-6 py-3 font-medium">Venue</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedInterviews.map((i) => (
                      <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{i.company?.name}</td>
                        <td className="px-6 py-3"><Badge className="bg-slate-100 text-slate-700 border-slate-200">{i.round}</Badge></td>
                        <td className="px-6 py-3 text-slate-600">{formatDateTime(i.scheduled_at)}</td>
                        <td className="px-6 py-3 text-slate-600">{i.venue ?? '—'}</td>
                        <td className="px-6 py-3"><Badge className={statusColor(i.status)}>{i.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardBody>
      </Card>

      {activeList.length > 0 && <div className="px-1"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>}
    </div>
  );
}

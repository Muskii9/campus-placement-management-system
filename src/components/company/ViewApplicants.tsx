import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Application, type JobPost, type Student } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Badge, Select, Pagination, EmptyState, Modal } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Users, Search, Download } from 'lucide-react';
import { formatINR, formatDate, statusColor, paginate, downloadCSV } from '@/lib/utils';

const PER_PAGE = 10;

interface ApplicantRow {
  application: Application;
  student: Student;
  deptCode: string;
}

export function ViewApplicants() {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailApplicant, setDetailApplicant] = useState<ApplicantRow | null>(null);

  const loadJobs = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('job_posts').select('*').eq('company_id', user.id).order('created_at', { ascending: false });
    if (data) setJobs(data as JobPost[]);
  }, [user?.id]);

  const loadApplicants = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    let jobIds = jobs.map((j) => j.id);
    if (selectedJob) jobIds = [selectedJob];
    if (jobIds.length === 0) { setApplicants([]); setLoading(false); return; }

    const { data: apps } = await supabase
      .from('applications')
      .select('*, job_post:job_posts(*), student:students(*)')
      .in('job_post_id', jobIds)
      .order('applied_at', { ascending: false });

    if (!apps) { setApplicants([]); setLoading(false); return; }

    // Fetch department codes
    const deptIds = [...new Set((apps as Application[]).map((a) => (a.student as Student)?.department_id).filter(Boolean))];
    const { data: depts } = await supabase.from('departments').select('id, code').in('id', deptIds);
    const deptMap = new Map((depts ?? []).map((d) => [d.id, d.code]));

    const rows: ApplicantRow[] = (apps as Application[]).map((a) => ({
      application: a,
      student: a.student as Student,
      deptCode: deptMap.get((a.student as Student)?.department_id ?? '') ?? '—',
    }));

    setApplicants(rows);
    setLoading(false);
  }, [user?.id, jobs, selectedJob]);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { if (jobs.length > 0) loadApplicants(); }, [loadApplicants]);

  const filtered = applicants.filter((r) => {
    if (statusFilter && r.application.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.student.name.toLowerCase().includes(q) || r.student.roll_no.toLowerCase().includes(q) || (r.student.skills ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = paginate(filtered, page, PER_PAGE);

  const updateStatus = async (appId: string, status: 'pending' | 'shortlisted' | 'selected' | 'rejected') => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', appId);
    if (error) toast('Update failed: ' + error.message, 'error');
    else {
      toast(`Applicant ${status}`, 'success');
      setApplicants(applicants.map((r) => r.application.id === appId ? { ...r, application: { ...r.application, status } } : r));
      if (detailApplicant?.application.id === appId) {
        setDetailApplicant({ ...detailApplicant, application: { ...detailApplicant.application, status } });
      }
    }
  };

  const exportApplicants = () => {
    downloadCSV('applicants.csv', filtered.map((r) => ({
      name: r.student.name, roll_no: r.student.roll_no, email: r.student.email,
      department: r.deptCode, cgpa: r.student.cgpa, skills: r.student.skills,
      job: r.application.job_post?.title, status: r.application.status,
      applied: formatDate(r.application.applied_at),
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applicants</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} applications received</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportApplicants}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, roll no, skills..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <Select value={selectedJob} onChange={(v) => { setSelectedJob(v); setPage(1); }} options={[{ value: '', label: 'All Jobs' }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]} className="sm:w-56" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>
          ) : paged.length === 0 ? (
            <EmptyState icon={<Users className="w-6 h-6" />} title="No applicants" message="Applications for your jobs will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Student</th>
                    <th className="px-6 py-3 font-medium">Dept</th>
                    <th className="px-6 py-3 font-medium">CGPA</th>
                    <th className="px-6 py-3 font-medium">Job</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr key={r.application.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <button onClick={() => setDetailApplicant(r)} className="text-left">
                          <p className="font-medium text-slate-800 hover:text-slate-900">{r.student.name}</p>
                          <p className="text-xs text-slate-500">{r.student.roll_no} • {r.student.email}</p>
                        </button>
                      </td>
                      <td className="px-6 py-3"><Badge className="bg-slate-100 text-slate-700 border-slate-200">{r.deptCode}</Badge></td>
                      <td className="px-6 py-3 font-semibold text-slate-700">{r.student.cgpa}</td>
                      <td className="px-6 py-3 text-slate-600">{r.application.job_post?.title}</td>
                      <td className="px-6 py-3"><Badge className={statusColor(r.application.status)}>{r.application.status}</Badge></td>
                      <td className="px-6 py-3 text-right">
                        <select
                          value={r.application.status}
                          onChange={(e) => updateStatus(r.application.id, e.target.value as 'pending' | 'shortlisted' | 'selected' | 'rejected')}
                          className="px-2 py-1 rounded-md border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                          <option value="pending">Pending</option>
                          <option value="shortlisted">Shortlist</option>
                          <option value="selected">Select</option>
                          <option value="rejected">Reject</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {!loading && filtered.length > 0 && <div className="px-1"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>}

      <Modal open={!!detailApplicant} onClose={() => setDetailApplicant(null)} title="Applicant Details" size="lg">
        {detailApplicant && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-white text-xl font-semibold">
                {detailApplicant.student.name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{detailApplicant.student.name}</p>
                <p className="text-sm text-slate-500">{detailApplicant.student.roll_no} • {detailApplicant.deptCode}</p>
              </div>
              <Badge className={`ml-auto ${statusColor(detailApplicant.application.status)}`}>{detailApplicant.application.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-800">{detailApplicant.student.email}</span></div>
              <div><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-800">{detailApplicant.student.phone ?? '—'}</span></div>
              <div><span className="text-slate-500">CGPA:</span> <span className="font-medium text-slate-800">{detailApplicant.student.cgpa}</span></div>
              <div><span className="text-slate-500">10th:</span> <span className="font-medium text-slate-800">{detailApplicant.student.tenth_percentage}%</span></div>
              <div><span className="text-slate-500">12th:</span> <span className="font-medium text-slate-800">{detailApplicant.student.twelfth_percentage}%</span></div>
              <div><span className="text-slate-500">Year:</span> <span className="font-medium text-slate-800">{detailApplicant.student.year_of_study}</span></div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {(detailApplicant.student.skills ?? '').split(',').filter(Boolean).map((s, i) => (
                  <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-100">{s.trim()}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Applied For</p>
              <p className="text-sm text-slate-600">{detailApplicant.application.job_post?.title} • {formatINR(detailApplicant.application.job_post?.package_ctc ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Applied on {formatDate(detailApplicant.application.applied_at)}</p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => updateStatus(detailApplicant.application.id, 'shortlisted')}>Shortlist</Button>
              <Button variant="primary" size="sm" onClick={() => updateStatus(detailApplicant.application.id, 'selected')}>Select</Button>
              <Button variant="danger" size="sm" onClick={() => updateStatus(detailApplicant.application.id, 'rejected')}>Reject</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

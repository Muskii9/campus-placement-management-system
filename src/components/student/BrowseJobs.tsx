import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type JobPost, type Student, type Application } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Badge, Pagination, EmptyState, Modal } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Search, Briefcase, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { formatINR, formatDate, paginate } from '@/lib/utils';

const PER_PAGE = 9;

export function BrowseJobs() {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailJob, setDetailJob] = useState<JobPost | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: s } = await supabase.from('students').select('*').eq('id', user.id).maybeSingle();
    if (s) setStudent(s as Student);

    const { data: apps } = await supabase.from('applications').select('job_post_id').eq('student_id', user.id);
    if (apps) setAppliedIds(new Set(apps.map((a) => (a as Application).job_post_id)));

    const { data: j } = await supabase
      .from('job_posts')
      .select('*, company:companies(*), drive:placement_drives(*)')
      .order('package_ctc', { ascending: false });
    if (j) setJobs(j as JobPost[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const isEligible = (job: JobPost): boolean => {
    if (!student) return false;
    if (student.cgpa < job.min_cgpa) return false;
    if (job.eligible_departments && job.eligible_departments !== 'ALL') {
      const deptCode = student.department_id;
      // Check if student's department code is in eligible list
      // We compare against department codes stored in eligible_departments
      return job.eligible_departments.includes(deptCode ?? '');
    }
    return true;
  };

  const apply = async (job: JobPost) => {
    if (!user?.id) return;
    if (appliedIds.has(job.id)) {
      toast('You have already applied for this job', 'info');
      return;
    }
    if (!isEligible(job)) {
      toast('You are not eligible for this job (CGPA or department requirement not met)', 'error');
      return;
    }
    const { error } = await supabase.from('applications').insert({
      student_id: user.id,
      job_post_id: job.id,
      status: 'pending',
    });
    if (error) {
      if (error.code === '23505') toast('You have already applied for this job', 'info');
      else toast('Application failed: ' + error.message, 'error');
    } else {
      toast('Application submitted successfully!', 'success');
      setAppliedIds(new Set([...appliedIds, job.id]));
    }
  };

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return j.title.toLowerCase().includes(q) || (j.company?.name ?? '').toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = paginate(filtered, page, PER_PAGE);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Browse Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">Find and apply for job opportunities</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search jobs by title or company..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {paged.length === 0 ? (
        <Card><CardBody><EmptyState icon={<Briefcase className="w-6 h-6" />} title="No jobs found" message="Try adjusting your search" /></CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((job) => {
            const eligible = isEligible(job);
            const applied = appliedIds.has(job.id);
            return (
              <Card key={job.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardBody className="flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-semibold">
                        {job.company?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{job.title}</p>
                        <p className="text-xs text-slate-500">{job.company?.name}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(job.package_ctc)}</Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {job.job_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.job_location}</span>}
                    <span>Min CGPA: {job.min_cgpa}</span>
                    <span>{job.no_of_vacancies} vacancies</span>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 flex-1">{job.description ?? 'No description available.'}</p>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                    {eligible ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100"><CheckCircle className="w-3 h-3 mr-1" /> Eligible</Badge>
                    ) : (
                      <Badge className="bg-rose-50 text-rose-600 border-rose-100"><XCircle className="w-3 h-3 mr-1" /> Not Eligible</Badge>
                    )}
                    {applied && <Badge className="bg-blue-50 text-blue-600 border-blue-100">Applied</Badge>}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setDetailJob(job)}>Details</Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={applied ? 'secondary' : 'primary'}
                      disabled={!eligible || applied}
                      onClick={() => apply(job)}
                    >
                      {applied ? 'Applied' : 'Apply Now'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      <Modal open={!!detailJob} onClose={() => setDetailJob(null)} title={detailJob?.title ?? ''} size="lg">
        {detailJob && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white font-semibold text-lg">
                {detailJob.company?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{detailJob.company?.name}</p>
                <p className="text-sm text-slate-500">{detailJob.job_type} • {detailJob.job_location}</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 ml-auto">{formatINR(detailJob.package_ctc)}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Min CGPA:</span> <span className="font-medium text-slate-800">{detailJob.min_cgpa}</span></div>
              <div><span className="text-slate-500">Vacancies:</span> <span className="font-medium text-slate-800">{detailJob.no_of_vacancies}</span></div>
              <div><span className="text-slate-500">Drive Date:</span> <span className="font-medium text-slate-800">{formatDate(detailJob.drive?.drive_date ?? '')}</span></div>
              <div><span className="text-slate-500">Last Date:</span> <span className="font-medium text-slate-800">{formatDate(detailJob.drive?.last_date_to_apply ?? '')}</span></div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Description</p>
              <p className="text-sm text-slate-600">{detailJob.description ?? 'No description available.'}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDetailJob(null)}>Close</Button>
              <Button
                disabled={!isEligible(detailJob) || appliedIds.has(detailJob.id)}
                onClick={() => { apply(detailJob); setDetailJob(null); }}
              >
                {appliedIds.has(detailJob.id) ? 'Already Applied' : 'Apply Now'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type PlacementDrive, type JobPost, type Department } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Input, Select, Textarea, Modal, Badge, Pagination, EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Plus, Briefcase, FileText, Pencil, Trash2 } from 'lucide-react';
import { formatDate, statusColor, paginate, formatINR } from '@/lib/utils';

const PER_PAGE = 8;

export function ManageDrivesJobs() {
  const { user } = useAuth();
  const toast = useToast();
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'drives' | 'jobs'>('drives');
  const [page, setPage] = useState(1);

  const [driveModal, setDriveModal] = useState(false);
  const [editingDrive, setEditingDrive] = useState<PlacementDrive | null>(null);
  const [driveForm, setDriveForm] = useState({ title: '', description: '', drive_date: '', last_date_to_apply: '', status: 'open' });

  const [jobModal, setJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPost | null>(null);
  const [jobForm, setJobForm] = useState({
    title: '', description: '', package_ctc: '', job_location: '', job_type: 'Full-time',
    min_cgpa: '6', eligible_departments: 'ALL', no_of_vacancies: '1', drive_id: '',
  });

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [dRes, jRes, deptRes] = await Promise.all([
      supabase.from('placement_drives').select('*').eq('company_id', user.id).order('drive_date', { ascending: false }),
      supabase.from('job_posts').select('*, drive:placement_drives(*)').eq('company_id', user.id).order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
    ]);
    if (dRes.data) setDrives(dRes.data as PlacementDrive[]);
    if (jRes.data) setJobs(jRes.data as JobPost[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const openAddDrive = () => {
    setEditingDrive(null);
    setDriveForm({ title: '', description: '', drive_date: '', last_date_to_apply: '', status: 'open' });
    setDriveModal(true);
  };

  const openEditDrive = (d: PlacementDrive) => {
    setEditingDrive(d);
    setDriveForm({
      title: d.title, description: d.description ?? '',
      drive_date: d.drive_date, last_date_to_apply: d.last_date_to_apply, status: d.status,
    });
    setDriveModal(true);
  };

  const saveDrive = async () => {
    if (!user?.id) return;
    if (!driveForm.title || !driveForm.drive_date || !driveForm.last_date_to_apply) {
      toast('Title, drive date, and last date are required', 'error');
      return;
    }
    const payload = {
      company_id: user.id,
      title: driveForm.title,
      description: driveForm.description,
      drive_date: driveForm.drive_date,
      last_date_to_apply: driveForm.last_date_to_apply,
      status: driveForm.status,
    };
    if (editingDrive) {
      const { error } = await supabase.from('placement_drives').update(payload).eq('id', editingDrive.id);
      if (error) toast('Update failed: ' + error.message, 'error');
      else { toast('Drive updated', 'success'); setDriveModal(false); load(); }
    } else {
      const { error } = await supabase.from('placement_drives').insert(payload);
      if (error) toast('Create failed: ' + error.message, 'error');
      else { toast('Drive created', 'success'); setDriveModal(false); load(); }
    }
  };

  const deleteDrive = async (d: PlacementDrive) => {
    if (!confirm(`Delete drive "${d.title}"? This will also delete all jobs in this drive.`)) return;
    const { error } = await supabase.from('placement_drives').delete().eq('id', d.id);
    if (error) toast('Delete failed: ' + error.message, 'error');
    else { toast('Drive deleted', 'success'); load(); }
  };

  const openAddJob = () => {
    if (drives.length === 0) {
      toast('Create a placement drive first', 'error');
      return;
    }
    setEditingJob(null);
    setJobForm({
      title: '', description: '', package_ctc: '', job_location: '', job_type: 'Full-time',
      min_cgpa: '6', eligible_departments: 'ALL', no_of_vacancies: '1', drive_id: drives[0]?.id ?? '',
    });
    setJobModal(true);
  };

  const openEditJob = (j: JobPost) => {
    setEditingJob(j);
    setJobForm({
      title: j.title, description: j.description ?? '', package_ctc: String(j.package_ctc),
      job_location: j.job_location ?? '', job_type: j.job_type, min_cgpa: String(j.min_cgpa),
      eligible_departments: j.eligible_departments, no_of_vacancies: String(j.no_of_vacancies),
      drive_id: j.drive_id,
    });
    setJobModal(true);
  };

  const saveJob = async () => {
    if (!user?.id) return;
    if (!jobForm.title || !jobForm.package_ctc || !jobForm.drive_id) {
      toast('Title, package, and drive are required', 'error');
      return;
    }
    const payload = {
      drive_id: jobForm.drive_id,
      company_id: user.id,
      title: jobForm.title,
      description: jobForm.description,
      package_ctc: parseFloat(jobForm.package_ctc) || 0,
      job_location: jobForm.job_location,
      job_type: jobForm.job_type,
      min_cgpa: parseFloat(jobForm.min_cgpa) || 6,
      eligible_departments: jobForm.eligible_departments,
      no_of_vacancies: parseInt(jobForm.no_of_vacancies) || 1,
    };
    if (editingJob) {
      const { error } = await supabase.from('job_posts').update(payload).eq('id', editingJob.id);
      if (error) toast('Update failed: ' + error.message, 'error');
      else { toast('Job updated', 'success'); setJobModal(false); load(); }
    } else {
      const { error } = await supabase.from('job_posts').insert(payload);
      if (error) toast('Create failed: ' + error.message, 'error');
      else { toast('Job posted', 'success'); setJobModal(false); load(); }
    }
  };

  const deleteJob = async (j: JobPost) => {
    if (!confirm(`Delete job "${j.title}"?`)) return;
    const { error } = await supabase.from('job_posts').delete().eq('id', j.id);
    if (error) toast('Delete failed: ' + error.message, 'error');
    else { toast('Job deleted', 'success'); load(); }
  };

  const activeList = tab === 'drives' ? drives : jobs;
  const totalPages = Math.ceil(activeList.length / PER_PAGE);
  const pagedDrives = paginate(drives, page, PER_PAGE) as PlacementDrive[];
  const pagedJobs = paginate(jobs, page, PER_PAGE) as JobPost[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drives & Job Posts</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage your recruitment drives</p>
        </div>
        <Button onClick={tab === 'drives' ? openAddDrive : openAddJob}>
          <Plus className="w-4 h-4 mr-1.5" /> {tab === 'drives' ? 'New Drive' : 'New Job Post'}
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button onClick={() => { setTab('drives'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'drives' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Drives ({drives.length})</button>
        <button onClick={() => { setTab('jobs'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'jobs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Jobs ({jobs.length})</button>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>
          ) : tab === 'drives' ? (
            pagedDrives.length === 0 ? (
              <EmptyState icon={<Briefcase className="w-6 h-6" />} title="No drives yet" message="Create your first placement drive" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-6 py-3 font-medium">Title</th>
                      <th className="px-6 py-3 font-medium">Drive Date</th>
                      <th className="px-6 py-3 font-medium">Last Date</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDrives.map((d) => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{d.title}</td>
                        <td className="px-6 py-3 text-slate-600">{formatDate(d.drive_date)}</td>
                        <td className="px-6 py-3 text-slate-600">{formatDate(d.last_date_to_apply)}</td>
                        <td className="px-6 py-3"><Badge className={statusColor(d.status)}>{d.status}</Badge></td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEditDrive(d)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteDrive(d)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            pagedJobs.length === 0 ? (
              <EmptyState icon={<FileText className="w-6 h-6" />} title="No jobs posted" message="Post your first job opening" />
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
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedJobs.map((j) => (
                      <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{j.title}</td>
                        <td className="px-6 py-3"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(j.package_ctc)}</Badge></td>
                        <td className="px-6 py-3 text-slate-600">{j.job_location ?? '—'}</td>
                        <td className="px-6 py-3 text-slate-600">{j.min_cgpa}</td>
                        <td className="px-6 py-3 text-slate-600">{j.no_of_vacancies}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEditJob(j)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteJob(j)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardBody>
      </Card>

      {!loading && activeList.length > 0 && <div className="px-1"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>}

      {/* Drive Modal */}
      <Modal open={driveModal} onClose={() => setDriveModal(false)} title={editingDrive ? 'Edit Drive' : 'New Placement Drive'}>
        <div className="space-y-4">
          <Input label="Drive Title" value={driveForm.title} onChange={(v) => setDriveForm({ ...driveForm, title: v })} required placeholder="e.g., Campus Recruitment 2025" />
          <Textarea label="Description" value={driveForm.description} onChange={(v) => setDriveForm({ ...driveForm, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Drive Date" type="date" value={driveForm.drive_date} onChange={(v) => setDriveForm({ ...driveForm, drive_date: v })} required />
            <Input label="Last Date to Apply" type="date" value={driveForm.last_date_to_apply} onChange={(v) => setDriveForm({ ...driveForm, last_date_to_apply: v })} required />
          </div>
          <Select label="Status" value={driveForm.status} onChange={(v) => setDriveForm({ ...driveForm, status: v })} options={[
            { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'completed', label: 'Completed' },
          ]} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDriveModal(false)}>Cancel</Button>
            <Button onClick={saveDrive}>{editingDrive ? 'Update' : 'Create'} Drive</Button>
          </div>
        </div>
      </Modal>

      {/* Job Modal */}
      <Modal open={jobModal} onClose={() => setJobModal(false)} title={editingJob ? 'Edit Job Post' : 'New Job Post'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Job Title" value={jobForm.title} onChange={(v) => setJobForm({ ...jobForm, title: v })} required />
            <Select label="Placement Drive" value={jobForm.drive_id} onChange={(v) => setJobForm({ ...jobForm, drive_id: v })} required options={drives.map((d) => ({ value: d.id, label: d.title }))} />
          </div>
          <Textarea label="Job Description" value={jobForm.description} onChange={(v) => setJobForm({ ...jobForm, description: v })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Package (CTC in ₹)" type="number" value={jobForm.package_ctc} onChange={(v) => setJobForm({ ...jobForm, package_ctc: v })} required placeholder="e.g., 800000" />
            <Input label="Min CGPA" type="number" value={jobForm.min_cgpa} onChange={(v) => setJobForm({ ...jobForm, min_cgpa: v })} />
            <Input label="Vacancies" type="number" value={jobForm.no_of_vacancies} onChange={(v) => setJobForm({ ...jobForm, no_of_vacancies: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Job Location" value={jobForm.job_location} onChange={(v) => setJobForm({ ...jobForm, job_location: v })} placeholder="e.g., Bangalore" />
            <Select label="Job Type" value={jobForm.job_type} onChange={(v) => setJobForm({ ...jobForm, job_type: v })} options={[
              { value: 'Full-time', label: 'Full-time' }, { value: 'Internship', label: 'Internship' }, { value: 'Contract', label: 'Contract' },
            ]} />
          </div>
          <Select label="Eligible Departments" value={jobForm.eligible_departments} onChange={(v) => setJobForm({ ...jobForm, eligible_departments: v })} options={[
            { value: 'ALL', label: 'All Departments' },
            ...departments.map((d) => ({ value: d.code, label: d.code })),
          ]} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setJobModal(false)}>Cancel</Button>
            <Button onClick={saveJob}>{editingJob ? 'Update' : 'Post'} Job</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

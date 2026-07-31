import { useEffect, useState, useCallback } from 'react';
import { supabase, type PlacementDrive, type JobPost, type Company } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Badge, Pagination, EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Search, Briefcase, Download } from 'lucide-react';
import { downloadCSV, paginate, formatINR, formatDate, statusColor } from '@/lib/utils';

const PER_PAGE = 10;

export function ManageDrives() {
  const toast = useToast();
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'drives' | 'jobs'>('drives');

  const load = useCallback(async () => {
    setLoading(true);
    const [drivesRes, jobsRes, compRes] = await Promise.all([
      supabase.from('placement_drives').select('*, company:companies(*)').order('drive_date', { ascending: false }),
      supabase.from('job_posts').select('*, company:companies(*), drive:placement_drives(*)').order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('name'),
    ]);
    if (drivesRes.data) setDrives(drivesRes.data as PlacementDrive[]);
    if (jobsRes.data) setJobs(jobsRes.data as JobPost[]);
    if (compRes.data) setCompanies(compRes.data as Company[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredDrives = drives.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || (d.company?.name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredJobs = jobs.filter((j) => {
    if (search) {
      const q = search.toLowerCase();
      return j.title.toLowerCase().includes(q) || (j.company?.name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const activeList = tab === 'drives' ? filteredDrives : filteredJobs;
  const totalPages = Math.ceil(activeList.length / PER_PAGE);
  const pagedDrives = paginate(filteredDrives, page, PER_PAGE) as PlacementDrive[];
  const pagedJobs = paginate(filteredJobs, page, PER_PAGE) as JobPost[];

  const exportDrives = () => {
    downloadCSV('placement_drives.csv', filteredDrives.map((d) => ({
      title: d.title, company: d.company?.name, drive_date: formatDate(d.drive_date),
      last_date: formatDate(d.last_date_to_apply), status: d.status,
    })));
  };

  const exportJobs = () => {
    downloadCSV('job_posts.csv', filteredJobs.map((j) => ({
      title: j.title, company: j.company?.name, package: j.package_ctc,
      location: j.job_location, min_cgpa: j.min_cgpa, vacancies: j.no_of_vacancies,
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Placement Drives & Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">{drives.length} drives, {jobs.length} job posts</p>
        </div>
        <Button variant="outline" size="sm" onClick={tab === 'drives' ? exportDrives : exportJobs}>
          <Download className="w-4 h-4 mr-1.5" /> Export
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button onClick={() => { setTab('drives'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'drives' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Drives</button>
        <button onClick={() => { setTab('jobs'); setPage(1); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === 'jobs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Job Posts</button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            {tab === 'drives' && (
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
              </select>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>
          ) : tab === 'drives' ? (
            pagedDrives.length === 0 ? (
              <EmptyState icon={<Briefcase className="w-6 h-6" />} title="No drives found" message="Try adjusting your filters" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-6 py-3 font-medium">Drive</th>
                      <th className="px-6 py-3 font-medium">Company</th>
                      <th className="px-6 py-3 font-medium">Drive Date</th>
                      <th className="px-6 py-3 font-medium">Last Date</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDrives.map((d) => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{d.title}</td>
                        <td className="px-6 py-3 text-slate-600">{d.company?.name ?? '—'}</td>
                        <td className="px-6 py-3 text-slate-600">{formatDate(d.drive_date)}</td>
                        <td className="px-6 py-3 text-slate-600">{formatDate(d.last_date_to_apply)}</td>
                        <td className="px-6 py-3"><Badge className={statusColor(d.status)}>{d.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            pagedJobs.length === 0 ? (
              <EmptyState icon={<Briefcase className="w-6 h-6" />} title="No jobs found" message="Try adjusting your search" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-6 py-3 font-medium">Job Title</th>
                      <th className="px-6 py-3 font-medium">Company</th>
                      <th className="px-6 py-3 font-medium">Package</th>
                      <th className="px-6 py-3 font-medium">Location</th>
                      <th className="px-6 py-3 font-medium">Min CGPA</th>
                      <th className="px-6 py-3 font-medium">Vacancies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedJobs.map((j) => (
                      <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{j.title}</td>
                        <td className="px-6 py-3 text-slate-600">{j.company?.name ?? '—'}</td>
                        <td className="px-6 py-3"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(j.package_ctc)}</Badge></td>
                        <td className="px-6 py-3 text-slate-600">{j.job_location ?? '—'}</td>
                        <td className="px-6 py-3 text-slate-600">{j.min_cgpa}</td>
                        <td className="px-6 py-3 text-slate-600">{j.no_of_vacancies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardBody>
      </Card>

      {!loading && activeList.length > 0 && (
        <div className="px-1"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
      )}
    </div>
  );
}

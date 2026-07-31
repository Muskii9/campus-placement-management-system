import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Badge, EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Award, TrendingUp, Building2, GraduationCap, Download, BarChart3 } from 'lucide-react';
import { formatINR, downloadCSV } from '@/lib/utils';

interface DeptStat {
  department_id: string;
  department_name: string;
  department_code: string;
  total_students: number;
  placed_students: number;
  placement_percentage: number;
  highest_package: number;
  average_package: number;
}

interface CompanyStat {
  company_id: string;
  company_name: string;
  total_jobs: number;
  total_applications: number;
  selected_count: number;
  highest_package: number;
  average_package: number;
}

export function AdminReports() {
  const toast = useToast();
  const [deptStats, setDeptStats] = useState<DeptStat[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStat[]>([]);
  const [topPackages, setTopPackages] = useState<{ name: string; company: string; package: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [deptRes, compRes, selRes] = await Promise.all([
      supabase.from('v_department_placement').select('*'),
      supabase.from('v_company_selection').select('*'),
      supabase.from('selected_students').select('student:students(name), company:companies(name), job_post:job_posts(title), package_ctc').order('package_ctc', { ascending: false }).limit(10),
    ]);

    if (deptRes.data) setDeptStats(deptRes.data as DeptStat[]);
    if (compRes.data) setCompanyStats(compRes.data as CompanyStat[]);
    if (selRes.data) {
      setTopPackages(selRes.data.map((r: Record<string, unknown>) => ({
        name: (r.student as { name: string })?.name ?? '—',
        company: (r.company as { name: string })?.name ?? '—',
        package: r.package_ctc as number,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportDept = () => {
    downloadCSV('department_report.csv', deptStats.map((d) => ({
      department: d.department_name, code: d.department_code,
      total_students: d.total_students, placed: d.placed_students,
      placement_percentage: d.placement_percentage,
      highest_package: d.highest_package, average_package: d.average_package,
    })));
    toast('Department report exported', 'success');
  };

  const exportCompany = () => {
    downloadCSV('company_report.csv', companyStats.map((c) => ({
      company: c.company_name, total_jobs: c.total_jobs,
      total_applications: c.total_applications, selected: c.selected_count,
      highest_package: c.highest_package, average_package: c.average_package,
    })));
    toast('Company report exported', 'success');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Placement Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Comprehensive analytics and insights</p>
      </div>

      {/* Department-wise report */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Department-wise Placement Report</h3>
          </div>
          <Button variant="outline" size="sm" onClick={exportDept}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
        </CardHeader>
        <CardBody className="p-0">
          {deptStats.length === 0 ? (
            <EmptyState icon={<BarChart3 className="w-6 h-6" />} title="No data" message="No department statistics available" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Department</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium">Placed</th>
                    <th className="px-6 py-3 font-medium">Placement %</th>
                    <th className="px-6 py-3 font-medium">Highest Package</th>
                    <th className="px-6 py-3 font-medium">Avg Package</th>
                  </tr>
                </thead>
                <tbody>
                  {deptStats.map((d) => (
                    <tr key={d.department_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800">{d.department_name}</p>
                        <p className="text-xs text-slate-500">{d.department_code}</p>
                      </td>
                      <td className="px-6 py-3 text-slate-700">{d.total_students}</td>
                      <td className="px-6 py-3 text-slate-700">{d.placed_students}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(d.placement_percentage, 100)}%` }} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{d.placement_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(d.highest_package)}</Badge></td>
                      <td className="px-6 py-3 text-slate-700">{formatINR(d.average_package)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Company-wise report */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Company-wise Selection Report</h3>
          </div>
          <Button variant="outline" size="sm" onClick={exportCompany}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
        </CardHeader>
        <CardBody className="p-0">
          {companyStats.length === 0 ? (
            <EmptyState icon={<Building2 className="w-6 h-6" />} title="No data" message="No company statistics available" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Jobs</th>
                    <th className="px-6 py-3 font-medium">Applications</th>
                    <th className="px-6 py-3 font-medium">Selected</th>
                    <th className="px-6 py-3 font-medium">Highest</th>
                    <th className="px-6 py-3 font-medium">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {companyStats.map((c) => (
                    <tr key={c.company_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-800">{c.company_name}</td>
                      <td className="px-6 py-3 text-slate-700">{c.total_jobs}</td>
                      <td className="px-6 py-3 text-slate-700">{c.total_applications}</td>
                      <td className="px-6 py-3"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{c.selected_count}</Badge></td>
                      <td className="px-6 py-3 text-slate-700">{formatINR(c.highest_package)}</td>
                      <td className="px-6 py-3 text-slate-700">{formatINR(c.average_package)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Top packages */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Highest Package Report</h3>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {topPackages.length === 0 ? (
            <EmptyState icon={<TrendingUp className="w-6 h-6" />} title="No selections yet" message="No students have been placed yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Rank</th>
                    <th className="px-6 py-3 font-medium">Student</th>
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Package</th>
                  </tr>
                </thead>
                <tbody>
                  {topPackages.map((p, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-6 py-3 text-slate-600">{p.company}</td>
                      <td className="px-6 py-3"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{formatINR(p.package)}</Badge></td>
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

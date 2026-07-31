import { useEffect, useState, useCallback } from 'react';
import { supabase, type Student, type Department } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Input, Select, Modal, Badge, Pagination, EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Search, Plus, Pencil, Trash2, Users, Download } from 'lucide-react';
import { downloadCSV, paginate } from '@/lib/utils';

const PER_PAGE = 10;

export function ManageStudents() {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', roll_no: '',
    department_id: '', cgpa: '', tenth_percentage: '', twelfth_percentage: '', skills: '',
  });

  const loadDepartments = useCallback(async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setDepartments(data as Department[]);
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('students').select('*').order('name');
    if (deptFilter) query = query.eq('department_id', deptFilter);
    const { data, error } = await query;
    if (error) {
      toast('Failed to load students: ' + error.message, 'error');
    } else {
      let filtered = data as Student[];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.roll_no.toLowerCase().includes(q) ||
          (s.skills ?? '').toLowerCase().includes(q)
        );
      }
      setStudents(filtered);
    }
    setLoading(false);
  }, [deptFilter, search, toast]);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.code ?? '—';

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', roll_no: '', department_id: '', cgpa: '', tenth_percentage: '', twelfth_percentage: '', skills: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      name: s.name, email: s.email, phone: s.phone ?? '', roll_no: s.roll_no,
      department_id: s.department_id ?? '', cgpa: String(s.cgpa),
      tenth_percentage: String(s.tenth_percentage), twelfth_percentage: String(s.twelfth_percentage),
      skills: s.skills ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.email || !form.roll_no) {
      toast('Name, email, and roll number are required', 'error');
      return;
    }
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      roll_no: form.roll_no,
      department_id: form.department_id || null,
      cgpa: parseFloat(form.cgpa) || 0,
      tenth_percentage: parseFloat(form.tenth_percentage) || 0,
      twelfth_percentage: parseFloat(form.twelfth_percentage) || 0,
      skills: form.skills,
    };
    if (editing) {
      const { error } = await supabase.from('students').update(payload).eq('id', editing.id);
      if (error) toast('Update failed: ' + error.message, 'error');
      else { toast('Student updated', 'success'); setModalOpen(false); loadStudents(); }
    } else {
      toast('Use the registration page to create student accounts (auth required)', 'info');
      setModalOpen(false);
    }
  };

  const remove = async (s: Student) => {
    if (!confirm(`Delete ${s.name}? This will also delete their applications and interviews.`)) return;
    const { error } = await supabase.from('students').delete().eq('id', s.id);
    if (error) toast('Delete failed: ' + error.message, 'error');
    else { toast('Student deleted', 'success'); loadStudents(); }
  };

  const exportCSV = () => {
    downloadCSV('students.csv', students.map((s) => ({
      roll_no: s.roll_no, name: s.name, email: s.email, phone: s.phone,
      department: deptName(s.department_id), cgpa: s.cgpa,
      tenth: s.tenth_percentage, twelfth: s.twelfth_percentage, skills: s.skills,
    })));
  };

  const filtered = students;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = paginate(filtered, page, PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Students</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} students registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email, roll no, skills..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <Select
              value={deptFilter}
              onChange={(v) => { setDeptFilter(v); setPage(1); }}
              options={[{ value: '', label: 'All Departments' }, ...departments.map((d) => ({ value: d.id, label: d.code }))]}
              className="sm:w-48"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>
          ) : paged.length === 0 ? (
            <EmptyState icon={<Users className="w-6 h-6" />} title="No students found" message="Try adjusting your search or filters" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Roll No</th>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Dept</th>
                    <th className="px-6 py-3 font-medium">CGPA</th>
                    <th className="px-6 py-3 font-medium">Skills</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{s.roll_no}</td>
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </td>
                      <td className="px-6 py-3"><Badge className="bg-slate-100 text-slate-700 border-slate-200">{deptName(s.department_id)}</Badge></td>
                      <td className="px-6 py-3 font-semibold text-slate-700">{s.cgpa}</td>
                      <td className="px-6 py-3 text-xs text-slate-600 max-w-xs truncate">{s.skills}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => remove(s)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {!loading && filtered.length > 0 && (
        <div className="px-1"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'}>
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Roll Number" value={form.roll_no} onChange={(v) => setForm({ ...form, roll_no: v })} required />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
          <Select
            label="Department"
            value={form.department_id}
            onChange={(v) => setForm({ ...form, department_id: v })}
            options={[{ value: '', label: 'Select department' }, ...departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))]}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="CGPA" type="number" value={form.cgpa} onChange={(v) => setForm({ ...form, cgpa: v })} />
            <Input label="10th %" type="number" value={form.tenth_percentage} onChange={(v) => setForm({ ...form, tenth_percentage: v })} />
            <Input label="12th %" type="number" value={form.twelfth_percentage} onChange={(v) => setForm({ ...form, twelfth_percentage: v })} />
          </div>
          <Input label="Skills (comma-separated)" value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Add'} Student</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

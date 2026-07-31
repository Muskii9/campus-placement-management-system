import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Student, type Department, type Resume } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Input, Select, Badge, EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { GraduationCap, FileText, Upload, Save } from 'lucide-react';

export function StudentProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', department_id: '', cgpa: '',
    tenth_percentage: '', twelfth_percentage: '', skills: '',
  });

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: s } = await supabase.from('students').select('*').eq('id', user.id).maybeSingle();
    if (s) {
      const st = s as Student;
      setStudent(st);
      setForm({
        name: st.name, phone: st.phone ?? '', department_id: st.department_id ?? '',
        cgpa: String(st.cgpa), tenth_percentage: String(st.tenth_percentage),
        twelfth_percentage: String(st.twelfth_percentage), skills: st.skills ?? '',
      });
    }
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    if (depts) setDepartments(depts as Department[]);
    const { data: r } = await supabase.from('resumes').select('*').eq('student_id', user.id).maybeSingle();
    if (r) setResume(r as Resume);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from('students').update({
      name: form.name,
      phone: form.phone,
      department_id: form.department_id || null,
      cgpa: parseFloat(form.cgpa) || 0,
      tenth_percentage: parseFloat(form.tenth_percentage) || 0,
      twelfth_percentage: parseFloat(form.twelfth_percentage) || 0,
      skills: form.skills,
    }).eq('id', user.id);
    if (error) toast('Update failed: ' + error.message, 'error');
    else toast('Profile updated successfully', 'success');
    setSaving(false);
  };

  const uploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 500_000) {
      toast('File too large (max 500KB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const { error } = await supabase.from('resumes').upsert({
        student_id: user.id,
        file_name: file.name,
        file_data: base64,
      }, { onConflict: 'student_id' });
      if (error) toast('Resume upload failed: ' + error.message, 'error');
      else { toast('Resume uploaded', 'success'); load(); }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal and academic details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><h3 className="font-semibold text-slate-900">Academic Details</h3></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Select
                label="Department"
                value={form.department_id}
                onChange={(v) => setForm({ ...form, department_id: v })}
                options={[{ value: '', label: 'Select department' }, ...departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))]}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input label="10th %" type="number" value={form.tenth_percentage} onChange={(v) => setForm({ ...form, tenth_percentage: v })} />
                <Input label="12th %" type="number" value={form.twelfth_percentage} onChange={(v) => setForm({ ...form, twelfth_percentage: v })} />
                <Input label="CGPA" type="number" value={form.cgpa} onChange={(v) => setForm({ ...form, cgpa: v })} />
              </div>
              <Input label="Skills (comma-separated)" value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} placeholder="Java, Python, React" />
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-1.5" /> Save Changes</>}
              </Button>
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><h3 className="font-semibold text-slate-900">Resume</h3></CardHeader>
            <CardBody>
              {resume ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <FileText className="w-8 h-8 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{resume.file_name}</p>
                      <p className="text-xs text-slate-500">Uploaded {new Date(resume.uploaded_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <label className="block">
                    <Button variant="outline" size="sm" className="w-full"><Upload className="w-4 h-4 mr-1.5" /> Replace Resume</Button>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={uploadResume} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <EmptyState icon={<FileText className="w-6 h-6" />} title="No resume uploaded" message="Upload your resume to apply for jobs" />
                  <label className="block">
                    <Button variant="outline" size="sm" className="w-full"><Upload className="w-4 h-4 mr-1.5" /> Upload Resume</Button>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={uploadResume} className="hidden" />
                  </label>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="mt-6">
            <CardHeader><h3 className="font-semibold text-slate-900">Profile Summary</h3></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Roll No</span><span className="font-medium text-slate-800">{student?.roll_no}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-800 truncate ml-2">{student?.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Year</span><span className="font-medium text-slate-800">{student?.year_of_study}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">CGPA</span><Badge className="bg-blue-100 text-blue-700 border-blue-200">{student?.cgpa}</Badge></div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

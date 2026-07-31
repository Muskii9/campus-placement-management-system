import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Input, Select } from '@/components/ui/Primitives';
import { GraduationCap, Building2, Shield, Sparkles, TrendingUp, Users, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Department } from '@/lib/supabase';
import { useEffect } from 'react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'student' | 'company'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [regData, setRegData] = useState({
    roll_no: '', phone: '', department_id: '',
    tenth_percentage: '', twelfth_percentage: '', cgpa: '', skills: '',
    contact_person: '', contact_phone: '', website: '', address: '', description: '',
  });

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      if (data) setDepartments(data as Department[]);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) toast(error, 'error');
        else toast('Welcome back!', 'success');
      } else {
        if (role === 'student') {
          if (!regData.roll_no || !regData.department_id || !regData.cgpa) {
            toast('Roll number, department, and CGPA are required', 'error');
            setLoading(false);
            return;
          }
          const { error } = await signUp(email, password, 'student', fullName, {
            roll_no: regData.roll_no,
            phone: regData.phone,
            department_id: regData.department_id,
            tenth_percentage: parseFloat(regData.tenth_percentage) || 0,
            twelfth_percentage: parseFloat(regData.twelfth_percentage) || 0,
            cgpa: parseFloat(regData.cgpa) || 0,
            skills: regData.skills,
          });
          if (error) toast(error, 'error');
          else toast('Account created! Please sign in.', 'success');
        } else {
          const { error } = await signUp(email, password, 'company', fullName, {
            contact_person: regData.contact_person,
            contact_phone: regData.contact_phone,
            website: regData.website,
            address: regData.address,
            description: regData.description,
          });
          if (error) toast(error, 'error');
          else toast('Company account created! Please sign in.', 'success');
        }
        if (mode === 'register' && !loading) setMode('login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoRole: 'admin' | 'student' | 'company') => {
    if (demoRole === 'admin') { setEmail('admin@cpms.edu'); setPassword('admin123'); }
    else if (demoRole === 'student') { setEmail('student1@cpms.edu'); setPassword('student123'); }
    else { setEmail('company1@cpms.com'); setPassword('company123'); }
    setMode('login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-800 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800 rounded-full translate-y-1/2 -translate-x-1/4 opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-xl font-semibold">CPMS</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Campus Placement<br />Management System
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            A unified platform connecting students, companies, and placement cells for seamless campus recruitment.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: Users, label: '50+ Students', desc: 'Registered & active' },
            { icon: Building2, label: '10 Companies', desc: 'Hiring partners' },
            { icon: Briefcase, label: '40+ Jobs', desc: 'Active openings' },
            { icon: TrendingUp, label: 'Real-time', desc: 'Placement tracking' },
          ].map((f) => (
            <div key={f.label} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <f.icon className="w-5 h-5 text-slate-300 mb-2" />
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-xs text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">CPMS</span>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Register
              </button>
            </div>

            {mode === 'register' && (
              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6">
                <button
                  onClick={() => setRole('student')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  <GraduationCap className="w-4 h-4" /> Student
                </button>
                <button
                  onClick={() => setRole('company')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${role === 'company' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  <Building2 className="w-4 h-4" /> Company
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <Input label="Full Name" value={fullName} onChange={setFullName} required placeholder={role === 'student' ? 'John Doe' : 'Tech Corp Inc.'} />
              )}
              <Input label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" />
              <Input label="Password" type="password" value={password} onChange={setPassword} required placeholder="••••••••" />

              {mode === 'register' && role === 'student' && (
                <>
                  <Input label="Roll Number" value={regData.roll_no} onChange={(v) => setRegData({ ...regData, roll_no: v })} required placeholder="2021CSE001" />
                  <Select
                    label="Department"
                    value={regData.department_id}
                    onChange={(v) => setRegData({ ...regData, department_id: v })}
                    required
                    options={[{ value: '', label: 'Select department' }, ...departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))]}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="10th %" type="number" value={regData.tenth_percentage} onChange={(v) => setRegData({ ...regData, tenth_percentage: v })} placeholder="85" />
                    <Input label="12th %" type="number" value={regData.twelfth_percentage} onChange={(v) => setRegData({ ...regData, twelfth_percentage: v })} placeholder="80" />
                    <Input label="CGPA" type="number" value={regData.cgpa} onChange={(v) => setRegData({ ...regData, cgpa: v })} required placeholder="8.5" />
                  </div>
                  <Input label="Phone" value={regData.phone} onChange={(v) => setRegData({ ...regData, phone: v })} placeholder="9876543210" />
                  <Input label="Skills (comma-separated)" value={regData.skills} onChange={(v) => setRegData({ ...regData, skills: v })} placeholder="Java, Python, React" />
                </>
              )}

              {mode === 'register' && role === 'company' && (
                <>
                  <Input label="Contact Person" value={regData.contact_person} onChange={(v) => setRegData({ ...regData, contact_person: v })} placeholder="HR Manager" />
                  <Input label="Contact Phone" value={regData.contact_phone} onChange={(v) => setRegData({ ...regData, contact_phone: v })} placeholder="9876543210" />
                  <Input label="Website" value={regData.website} onChange={(v) => setRegData({ ...regData, website: v })} placeholder="www.company.com" />
                  <Input label="Address" value={regData.address} onChange={(v) => setRegData({ ...regData, address: v })} placeholder="City, State" />
                </>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Quick demo login:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => fillDemo('admin')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <Shield className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-medium text-slate-700">Admin</span>
                </button>
                <button onClick={() => fillDemo('student')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <GraduationCap className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-medium text-slate-700">Student</span>
                </button>
                <button onClick={() => fillDemo('company')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-medium text-slate-700">Company</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

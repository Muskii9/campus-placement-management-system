import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Company } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Badge } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Save, Building2, ExternalLink } from 'lucide-react';

export function CompanyProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', contact_person: '', contact_phone: '', website: '', address: '', description: '',
  });

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('companies').select('*').eq('id', user.id).maybeSingle();
    if (data) {
      const c = data as Company;
      setCompany(c);
      setForm({
        name: c.name, contact_person: c.contact_person ?? '', contact_phone: c.contact_phone ?? '',
        website: c.website ?? '', address: c.address ?? '', description: c.description ?? '',
      });
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update({
      name: form.name, contact_person: form.contact_person, contact_phone: form.contact_phone,
      website: form.website, address: form.address, description: form.description,
    }).eq('id', user.id);
    if (error) toast('Update failed: ' + error.message, 'error');
    else toast('Company profile updated', 'success');
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your company information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><h3 className="font-semibold text-slate-900">Company Details</h3></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Company Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Contact Person" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} />
                <Input label="Contact Phone" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
              </div>
              <Input label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="www.company.com" />
              <Input label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <Textarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={4} />
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-1.5" /> Save Changes</>}
              </Button>
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><h3 className="font-semibold text-slate-900">Summary</h3></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xl font-semibold">
                  {company?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{company?.name}</p>
                  <p className="text-xs text-slate-500">{company?.email}</p>
                </div>
              </div>
              {company?.website && (
                <a href={`https://${company.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <ExternalLink className="w-3 h-3" /> {company.website}
                </a>
              )}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Contact</p>
                <p className="text-sm font-medium text-slate-800">{company?.contact_person ?? '—'}</p>
                <p className="text-sm text-slate-600">{company?.contact_phone ?? '—'}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

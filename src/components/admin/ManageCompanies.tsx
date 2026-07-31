import { useEffect, useState, useCallback } from 'react';
import { supabase, type Company } from '@/lib/supabase';
import { Card, CardBody, CardHeader, Button, Input, Modal, Badge, Pagination, EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { Search, Pencil, Trash2, Building2, Download, ExternalLink } from 'lucide-react';
import { downloadCSV, paginate } from '@/lib/utils';

const PER_PAGE = 10;

export function ManageCompanies() {
  const toast = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', contact_person: '', contact_phone: '', website: '', address: '', description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('companies').select('*').order('name');
    if (error) toast('Failed to load companies: ' + error.message, 'error');
    else setCompanies(data as Company[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.contact_person ?? '').toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = paginate(filtered, page, PER_PAGE);

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      name: c.name, email: c.email, contact_person: c.contact_person ?? '',
      contact_phone: c.contact_phone ?? '', website: c.website ?? '',
      address: c.address ?? '', description: c.description ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from('companies').update({
      name: form.name, contact_person: form.contact_person, contact_phone: form.contact_phone,
      website: form.website, address: form.address, description: form.description,
    }).eq('id', editing.id);
    if (error) toast('Update failed: ' + error.message, 'error');
    else { toast('Company updated', 'success'); setModalOpen(false); load(); }
  };

  const remove = async (c: Company) => {
    if (!confirm(`Delete ${c.name}? This will also delete their drives and jobs.`)) return;
    const { error } = await supabase.from('companies').delete().eq('id', c.id);
    if (error) toast('Delete failed: ' + error.message, 'error');
    else { toast('Company deleted', 'success'); load(); }
  };

  const exportCSV = () => {
    downloadCSV('companies.csv', companies.map((c) => ({
      name: c.name, email: c.email, contact_person: c.contact_person,
      contact_phone: c.contact_phone, website: c.website, address: c.address,
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Companies</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} companies registered</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search companies..."
              className="w-full sm:w-80 pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>
          ) : paged.length === 0 ? (
            <EmptyState icon={<Building2 className="w-6 h-6" />} title="No companies found" message="Try adjusting your search" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Contact</th>
                    <th className="px-6 py-3 font-medium">Website</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-slate-700">{c.contact_person ?? '—'}</p>
                        <p className="text-xs text-slate-500">{c.contact_phone ?? ''}</p>
                      </td>
                      <td className="px-6 py-3">
                        {c.website ? (
                          <a href={`https://${c.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                            {c.website} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => remove(c)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button>
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

      {!loading && filtered.length > 0 && <div className="px-1"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Edit Company">
        <div className="space-y-4">
          <Input label="Company Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Contact Person" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} />
          <Input label="Contact Phone" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
          <Input label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Input label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>Update Company</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

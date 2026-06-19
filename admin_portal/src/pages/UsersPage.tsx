import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAuth, AdminUser } from '../api/adminAuth';
import { adminTurfs } from '../api/adminTurfs';

type UserForm = { email: string; name: string; role: string; turf_id: string; password: string };
const emptyForm: UserForm = { email: '', name: '', role: 'turf_owner', turf_id: '', password: '' };

export default function UsersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [formErr, setFormErr] = useState('');
  const [pwModal, setPwModal] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminAuth.listUsers,
  });

  const { data: turfs = [] } = useQuery({
    queryKey: ['admin-turfs'],
    queryFn: adminTurfs.list,
  });

  const addMutation = useMutation({
    mutationFn: () => adminAuth.createUser({
      email: form.email, name: form.name, role: form.role,
      turf_id: form.role === 'turf_owner' ? (form.turf_id || null) : null,
      password: form.password,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: () => setFormErr('Failed to create user (email may already exist)'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminAuth.updateUser(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const pwMutation = useMutation({
    mutationFn: () => adminAuth.changePassword(pwModal!, newPw),
    onSuccess: () => { setPwModal(null); setNewPw(''); },
    onError: () => alert('Failed to change password'),
  });

  const submitForm = () => {
    if (!form.email || !form.name || !form.password) { setFormErr('Email, name and password are required'); return; }
    if (form.password.length < 8) { setFormErr('Password must be at least 8 characters'); return; }
    setFormErr('');
    addMutation.mutate();
  };

  const set = (k: keyof UserForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Portal Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage who can access the admin portal</p>
        </div>
        <button onClick={() => { setShowAdd(true); setForm(emptyForm); setFormErr(''); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          + Add User
        </button>
      </div>

      {showAdd && (
        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 mb-6">
          <h3 className="font-medium text-slate-700 mb-4">New Portal User</h3>
          <div className="grid grid-cols-2 gap-4">
            {([['Full Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']] as [string, keyof UserForm, string][]).map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{label} *</label>
                <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
                <option value="administrator">Administrator</option>
                <option value="turf_owner">Turf Owner</option>
              </select>
            </div>
            {form.role === 'turf_owner' && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Assign Turf</label>
                <select value={form.turf_id} onChange={e => set('turf_id', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
                  <option value="">— Select turf —</option>
                  {turfs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {formErr && <p className="text-red-500 text-xs mt-2">{formErr}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={submitForm} disabled={addMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {addMutation.isPending ? 'Creating…' : 'Create User'}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-medium text-left">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: AdminUser) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-700">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'administrator' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role === 'administrator' ? 'Admin' : 'Turf Owner'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => { setPwModal(u.id); setNewPw(''); }}
                      className="text-xs text-indigo-500 hover:text-indigo-700">
                      Change Password
                    </button>
                    <button onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
                      className={`text-xs ${u.is_active ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Change password modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-slate-700 mb-4">Change Password</h3>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => pwMutation.mutate()} disabled={pwMutation.isPending || newPw.length < 8}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {pwMutation.isPending ? 'Saving…' : 'Update Password'}
              </button>
              <button onClick={() => setPwModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

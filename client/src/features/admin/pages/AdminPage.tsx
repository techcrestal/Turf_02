import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../api/endpoints/auth';
import type { ApproveOwnerResponse, OwnerRegistration } from '../../../types/auth';

type Tab = 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: OwnerRegistration['status'] }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ApproveModal({
  reg,
  onClose,
  onApproved,
}: {
  reg: OwnerRegistration;
  onClose: () => void;
  onApproved: (creds: ApproveOwnerResponse['credentials']) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const approveMut = useMutation({
    mutationFn: () => authApi.adminApproveOwner(reg.id, { username, password }),
    onSuccess: (data) => onApproved(data.credentials),
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data?.error?.message
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as Error).message
        ?? 'Failed to approve';
      setError(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Approve Registration</h3>
        <p className="text-slate-500 text-sm mb-4">
          Create login credentials for <strong>{reg.first_name} {reg.last_name}</strong>
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Username *</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="owner_username"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Password *</label>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="flex-1 px-4 py-3 text-sm outline-none bg-white"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="px-3 text-slate-400 text-lg">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => { setError(''); approveMut.mutate(); }}
            disabled={!username || password.length < 6 || approveMut.isPending}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl"
          >
            {approveMut.isPending ? 'Approving...' : 'Approve & Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ reg, onClose, onRejected }: { reg: OwnerRegistration; onClose: () => void; onRejected: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const rejectMut = useMutation({
    mutationFn: () => authApi.adminRejectOwner(reg.id, reason || undefined),
    onSuccess: onRejected,
    onError: (e: unknown) => {
      setError((e as Error).message ?? 'Failed to reject');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Reject Registration</h3>
        <p className="text-slate-500 text-sm mb-4">
          Rejecting <strong>{reg.first_name} {reg.last_name}</strong>'s registration for <em>{(reg.turf_data as { name?: string }).name ?? 'turf'}</em>.
        </p>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Reason (optional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="e.g. Incomplete information, duplicate listing..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">
            {rejectMut.isPending ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CredentialCard({ creds, onDismiss }: { creds: ApproveOwnerResponse['credentials']; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = `SquadEazy Owner Credentials
----------------------------
Name: ${creds.name}
Phone: ${creds.phone_number}
Email: ${creds.email}

Login Details:
Username: ${creds.username}
Password: ${creds.password}

Your turf "${creds.turf_name}" has been approved and is now live on SquadEazy!
Login at the SquadEazy app → use username & password, or phone number + OTP.`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-lg font-bold text-slate-800">Owner Approved!</h3>
          <p className="text-slate-500 text-sm">Copy and send this message to the owner</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed mb-4">
          {message}
        </div>
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className={`flex-1 font-bold py-3 rounded-xl transition-colors ${copied ? 'bg-emerald-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
            {copied ? '✓ Copied!' : '📋 Copy Message'}
          </button>
          <button onClick={onDismiss} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50">Done</button>
        </div>
      </div>
    </div>
  );
}

function RegistrationCard({
  reg,
  onApprove,
  onReject,
}: {
  reg: OwnerRegistration;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const td = reg.turf_data as Record<string, unknown>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button className="w-full text-left p-4" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-slate-800 text-sm truncate">{reg.first_name} {reg.last_name}</p>
              <StatusBadge status={reg.status} />
            </div>
            <p className="text-xs text-slate-500 truncate">{(td.name as string) ?? '—'} • {(td.city as string) ?? '—'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{reg.phone_number} • {reg.email}</p>
            <p className="text-xs text-slate-300 mt-0.5">{new Date(reg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <span className="text-slate-400 text-xs mt-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div><p className="text-slate-400">Sport</p><p className="text-slate-700 font-medium">{String(td.sport_id ?? '—').slice(0, 8)}…</p></div>
            <div><p className="text-slate-400">Starting from</p><p className="text-slate-700 font-medium">{td.starting_from_price != null ? `₹${td.starting_from_price}/slot` : '—'}</p></div>
            <div><p className="text-slate-400">Hours</p><p className="text-slate-700 font-medium">{String(td.opening_time ?? '')} – {String(td.closing_time ?? '')}</p></div>
            <div><p className="text-slate-400">Courts</p><p className="text-slate-700 font-medium">{Array.isArray(td.courts) ? td.courts.length : '—'}</p></div>
            <div><p className="text-slate-400">Photos</p><p className="text-slate-700 font-medium">{Array.isArray(td.photos) ? td.photos.length : '—'}</p></div>
            <div><p className="text-slate-400">Address</p><p className="text-slate-700 font-medium truncate">{String(td.address ?? '—')}</p></div>
          </div>

          {Array.isArray(td.photos) && (td.photos as string[]).length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {(td.photos as string[]).slice(0, 3).map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {reg.admin_notes && (
            <div className="bg-red-50 px-3 py-2 rounded-xl">
              <p className="text-xs text-red-600 font-medium">Rejection note: {reg.admin_notes}</p>
            </div>
          )}

          {reg.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <button onClick={onReject} className="flex-1 border border-red-200 text-red-500 font-semibold py-2.5 rounded-xl hover:bg-red-50 text-sm">Reject</button>
              <button onClick={onApprove} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm">Approve</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('pending');
  const [approveTarget, setApproveTarget] = useState<OwnerRegistration | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OwnerRegistration | null>(null);
  const [successCreds, setSuccessCreds] = useState<ApproveOwnerResponse['credentials'] | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-registrations'],
    queryFn: authApi.adminGetRegistrations,
    refetchInterval: 30000,
  });

  const registrations = data?.registrations ?? [];
  const byTab = registrations.filter(r => r.status === tab);
  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  const handleApproved = (creds: ApproveOwnerResponse['credentials']) => {
    setApproveTarget(null);
    setSuccessCreds(creds);
    queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
  };

  const handleRejected = () => {
    setRejectTarget(null);
    queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 px-5 pt-6 pb-6 text-white">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-slate-400 text-sm">Welcome,</p>
            <h1 className="text-2xl font-extrabold">Admin Dashboard</h1>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10">Logout</button>
        </div>
        <p className="text-slate-400 text-xs mt-1">Logged in as <span className="text-white font-semibold">{user?.username}</span></p>
      </div>

      {/* Stats strip */}
      <div className="px-5 -mt-3">
        <div className="grid grid-cols-3 gap-3">
          {(['pending', 'approved', 'rejected'] as Tab[]).map(t => {
            const count = registrations.filter(r => r.status === t).length;
            const styles = { pending: 'border-amber-200 text-amber-600', approved: 'border-emerald-200 text-emerald-600', rejected: 'border-red-200 text-red-500' };
            return (
              <div key={t} className={`bg-white rounded-2xl shadow-sm p-4 text-center border ${styles[t]}`}>
                <p className={`text-2xl font-extrabold ${styles[t]}`}>{isLoading ? '—' : count}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{t}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-5">
        <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white mb-4">
          {(['pending', 'approved', 'rejected'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t}{t === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">Failed to load registrations.</div>
        ) : byTab.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="text-4xl mb-2">{tab === 'pending' ? '📋' : tab === 'approved' ? '✅' : '❌'}</div>
            <p className="text-slate-500 font-medium">No {tab} registrations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {byTab.map(reg => (
              <RegistrationCard key={reg.id} reg={reg}
                onApprove={() => setApproveTarget(reg)}
                onReject={() => setRejectTarget(reg)} />
            ))}
          </div>
        )}
      </div>

      {approveTarget && (
        <ApproveModal reg={approveTarget} onClose={() => setApproveTarget(null)} onApproved={handleApproved} />
      )}
      {rejectTarget && (
        <RejectModal reg={rejectTarget} onClose={() => setRejectTarget(null)} onRejected={handleRejected} />
      )}
      {successCreds && (
        <CredentialCard creds={successCreds} onDismiss={() => setSuccessCreds(null)} />
      )}
    </div>
  );
}

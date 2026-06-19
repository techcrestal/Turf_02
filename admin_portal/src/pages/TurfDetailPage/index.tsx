import { useParams, useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminTurfs } from '../../api/adminTurfs';
import OverviewTab from './OverviewTab';
import PhotosTab from './PhotosTab';
import CourtsTab from './CourtsTab';
import BookingsTab from './BookingsTab';
import SettingsTab from './SettingsTab';
import { useAdminAuth } from '../../context/AdminAuthContext';

const tabs = [
  { path: '', label: 'Overview', end: true },
  { path: 'photos', label: 'Photos' },
  { path: 'courts', label: 'Courts & Slots' },
  { path: 'bookings', label: 'Bookings' },
  { path: 'settings', label: 'Settings' },
];

export default function TurfDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAdminAuth();

  const { data: turf, isLoading } = useQuery({
    queryKey: ['admin-turf', id],
    queryFn: () => adminTurfs.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!turf) return <div className="p-8 text-red-500">Turf not found.</div>;

  const base = `/turfs/${id}`;

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <button onClick={() => navigate('/turfs')} className="text-slate-400 hover:text-slate-600 text-sm mb-2">
          ← All Turfs
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{turf.name}</h1>
            <p className="text-slate-500 text-sm">{turf.city}, {turf.state} · {turf.sports?.name ?? ''}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
            turf.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {turf.status}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 -mb-5 border-b-0">
          {tabs
            .filter(t => t.path !== 'settings' || user?.role === 'administrator' || true)
            .map(tab => (
              <NavLink
                key={tab.path}
                to={tab.path ? `${base}/${tab.path}` : base}
                end={tab.end}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    isActive
                      ? 'text-indigo-600 border-indigo-600 bg-white'
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-8">
        <Routes>
          <Route index element={<OverviewTab turf={turf} turfId={id!} />} />
          <Route path="photos" element={<PhotosTab turfId={id!} />} />
          <Route path="courts" element={<CourtsTab turfId={id!} turf={turf} />} />
          <Route path="bookings" element={<BookingsTab turfId={id!} />} />
          <Route path="settings" element={<SettingsTab turfId={id!} isAdmin={user?.role === 'administrator'} />} />
        </Routes>
      </div>
    </div>
  );
}

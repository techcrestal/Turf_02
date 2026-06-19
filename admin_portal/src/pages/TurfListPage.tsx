import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminTurfs } from '../api/adminTurfs';
import { useAdminAuth } from '../context/AdminAuthContext';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-500',
    suspended: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500';
};

export default function TurfListPage() {
  const { user } = useAdminAuth();
  const navigate = useNavigate();
  const { data: turfs = [], isLoading } = useQuery({
    queryKey: ['admin-turfs'],
    queryFn: adminTurfs.list,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {user?.role === 'administrator' ? 'All Turfs' : 'My Turf'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{turfs.length} turf{turfs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : turfs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No turfs found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turfs.map(turf => (
            <button
              key={turf.id}
              onClick={() => navigate(`/turfs/${turf.id}`)}
              className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">{turf.name}</h3>
                  <p className="text-slate-400 text-sm truncate">{turf.city}, {turf.state}</p>
                </div>
                <span className={`ml-2 flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusBadge(turf.status)}`}>
                  {turf.status}
                </span>
              </div>
              {turf.sports && (
                <p className="text-slate-500 text-sm">{turf.sports.name}</p>
              )}
              <p className="text-indigo-600 text-xs font-medium mt-2">Manage →</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

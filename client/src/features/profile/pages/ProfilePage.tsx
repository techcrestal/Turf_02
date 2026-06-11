import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { usersApi } from '../../../api/endpoints/users';
import { useQuery } from '@tanstack/react-query';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji } from '../../../utils/helpers';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    username: user?.username ?? '',
    age: user?.age?.toString() ?? '',
    favorite_sports: user?.favorite_sports ?? [],
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const toggleSport = (id: string) => {
    setForm((prev) => ({
      ...prev,
      favorite_sports: prev.favorite_sports.includes(id)
        ? prev.favorite_sports.filter((s) => s !== id)
        : [...prev.favorite_sports, id],
    }));
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        name: form.name,
        email: form.email,
        username: form.username,
        age: form.age ? parseInt(form.age) : undefined,
        favorite_sports: form.favorite_sports,
      }),
    onSuccess: async () => {
      await refreshUser();
      setEditing(false);
      setToast('Profile updated!');
      setTimeout(() => setToast(''), 3000);
    },
    onError: () => {
      setToast('Failed to update profile');
      setTimeout(() => setToast(''), 3000);
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initial = (user?.name ?? user?.username ?? '?')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-white pb-24">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 pt-12 pb-8 text-white text-center lg:pt-8">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-extrabold mx-auto mb-3">
          {initial}
        </div>
        <h1 className="text-xl font-extrabold">{user?.name ?? user?.username ?? 'Player'}</h1>
        <p className="text-emerald-200 text-sm">@{user?.username ?? '—'}</p>
        <p className="text-emerald-200 text-sm mt-1">📱 +91 {user?.phone_number}</p>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:px-8 lg:py-6">
      {/* Left col (avatar/info summary on desktop) */}
      <div className="hidden lg:block lg:col-span-1">
        <div className="bg-slate-50 rounded-2xl p-6 text-center space-y-2">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-4xl font-extrabold text-emerald-700 mx-auto">
            {initial}
          </div>
          <p className="font-bold text-slate-800 text-lg">{user?.name ?? user?.username ?? 'Player'}</p>
          <p className="text-slate-500 text-sm">@{user?.username ?? '—'}</p>
          <p className="text-slate-400 text-xs">📱 +91 {user?.phone_number}</p>
        </div>
      </div>
      {/* Right col */}
      <div className="lg:col-span-2">
      <div className="px-5 py-5 space-y-5 lg:px-0 lg:py-0">
        {/* Info cards */}
        {!editing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">Email</p>
                <p className="text-sm font-medium text-slate-700 truncate">{user?.email ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">Age</p>
                <p className="text-sm font-medium text-slate-700">{user?.age ?? '—'}</p>
              </div>
            </div>

            {user?.favorite_sports && user.favorite_sports.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Favorite Sports</p>
                <div className="flex flex-wrap gap-2">
                  {user.favorite_sports.map((sportId) => {
                    const sport = sports.find((s) => s.id === sportId);
                    if (!sport) return null;
                    return (
                      <span
                        key={sportId}
                        className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full"
                      >
                        {getSportEmoji(sport.name)} {sport.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setForm({
                  name: user?.name ?? '',
                  email: user?.email ?? '',
                  username: user?.username ?? '',
                  age: user?.age?.toString() ?? '',
                  favorite_sports: user?.favorite_sports ?? [],
                });
                setEditing(true);
              }}
              className="w-full border border-emerald-500 text-emerald-600 font-semibold py-3 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              ✏️ Edit Profile
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="font-bold text-slate-800">Edit Profile</h2>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {sports.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Favorite Sports</label>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sport) => (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        form.favorite_sports.includes(sport.id)
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {getSportEmoji(sport.name)} {sport.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Owner section */}
        <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50">
          <p className="text-sm font-bold text-emerald-800 mb-1">🏟️ Turf Owner</p>
          <p className="text-xs text-emerald-600 mb-3">Manage your turfs, view bookings, and more</p>
          <Link
            to="/owner"
            className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl text-center text-sm transition-colors"
          >
            Switch to Owner Dashboard →
          </Link>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </div>{/* end right col inner */}
      </div>{/* end right col */}
      </div>{/* end lg:grid */}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { usersApi } from '../../../api/endpoints/users';
import { sportsApi } from '../../../api/endpoints/sports';
import { ratingsApi } from '../../../api/endpoints/ratings';
import { getSportEmoji } from '../../../utils/helpers';
import StarPicker from '../../../components/ratings/StarPicker';
import LocationPicker from '../../../components/map/LocationPicker';

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
    skill_ids: user?.skill_ids ?? [],
    home_lat: user?.home_lat ?? null as number | null,
    home_lng: user?.home_lng ?? null as number | null,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ['sport-skills'],
    queryFn: ratingsApi.getAllSkills,
  });

  const { data: myRatings } = useQuery({
    queryKey: ['player-ratings', user?.id],
    queryFn: () => ratingsApi.getPlayerRatings(user!.id),
    enabled: !!user?.id,
  });

  const skillsBySport = useMemo(() => {
    const map: Record<string, typeof allSkills> = {};
    allSkills.forEach((s) => {
      if (!map[s.sport_id]) map[s.sport_id] = [];
      map[s.sport_id].push(s);
    });
    return map;
  }, [allSkills]);

  const toggleSport = (id: string) => {
    const removing = form.favorite_sports.includes(id);
    const sportSkillIds = removing ? (skillsBySport[id] ?? []).map((s) => s.id) : [];
    setForm((prev) => ({
      ...prev,
      favorite_sports: removing
        ? prev.favorite_sports.filter((s) => s !== id)
        : [...prev.favorite_sports, id],
      skill_ids: removing
        ? prev.skill_ids.filter((sid) => !sportSkillIds.includes(sid))
        : prev.skill_ids,
    }));
  };

  const toggleSkill = (id: string) => {
    setForm((prev) => ({
      ...prev,
      skill_ids: prev.skill_ids.includes(id)
        ? prev.skill_ids.filter((s) => s !== id)
        : [...prev.skill_ids, id],
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
        skill_ids: form.skill_ids,
        home_lat: form.home_lat,
        home_lng: form.home_lng,
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
    queryClient.clear();
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

            {/* Home location */}
            {user?.home_lat && user?.home_lng && (
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <p className="text-xs text-slate-500">Home Location</p>
                  <p className="text-xs font-mono text-slate-600">
                    {user.home_lat.toFixed(4)}, {user.home_lng.toFixed(4)}
                  </p>
                </div>
                <span className="ml-auto text-xs text-emerald-600 font-medium">Saved</span>
              </div>
            )}

            {/* Player skill ratings */}
            {myRatings && myRatings.skills.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">My Skill Ratings</p>
                <div className="space-y-2">
                  {myRatings.skills.map((sr) => (
                    <div key={sr.skill_id} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-28 flex-shrink-0">{sr.display_name}</span>
                      <StarPicker value={Math.round(sr.average)} readonly size="sm" />
                      <span className="text-xs font-medium text-slate-500">{sr.average.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({sr.count})</span>
                    </div>
                  ))}
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
                  skill_ids: user?.skill_ids ?? [],
                  home_lat: user?.home_lat ?? null,
                  home_lng: user?.home_lng ?? null,
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

            {/* Skill selection per selected sport */}
            {form.favorite_sports.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">
                  Your Skills <span className="text-slate-400 font-normal text-xs">(others can rate you on these)</span>
                </label>
                {form.favorite_sports.map((sportId) => {
                  const sport = sports.find((s) => s.id === sportId);
                  const sportSkills = skillsBySport[sportId] ?? [];
                  if (!sportSkills.length) return null;
                  return (
                    <div key={sportId}>
                      <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                        {getSportEmoji(sport?.name ?? '')} {sport?.name}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sportSkills.map((skill) => (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => toggleSkill(skill.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              form.skill_ids.includes(skill.id)
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {skill.display_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Home location picker */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <LocationPicker
                lat={form.home_lat}
                lng={form.home_lng}
                onChange={(lat, lng) => setForm((p) => ({ ...p, home_lat: lat, home_lng: lng }))}
                label="Home Location"
              />
              <p className="text-xs text-slate-400 mt-2">Used to show nearby turfs and games</p>
            </div>

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

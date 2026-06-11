import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji } from '../../../utils/helpers';

export default function ProfileCreationPage() {
  const { createProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', username: '', age: '' });
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const toggleSport = (id: string) => {
    setSelectedSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.username) {
      setError('Name, email and username are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createProfile({
        name: form.name,
        email: form.email,
        username: form.username,
        age: form.age ? parseInt(form.age) : undefined,
        favorite_sports: selectedSports,
      });
      navigate('/home');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 pt-12 pb-8 text-white">
        <h1 className="text-2xl font-extrabold">Complete Your Profile</h1>
        <p className="text-emerald-100 text-sm mt-1">Tell us a bit about yourself</p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4 max-w-md mx-auto lg:max-w-2xl">
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Rahul Sharma"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="rahul@example.com"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Username *</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="rahul_plays"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Age</label>
          <input
            type="number"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            placeholder="25"
            min="10"
            max="100"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        </div>{/* end 2-col grid */}

        {sports.length > 0 && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Favorite Sports
            </label>
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => toggleSport(sport.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedSports.includes(sport.id)
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  {getSportEmoji(sport.name)} {sport.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            'Complete Profile'
          )}
        </button>
      </form>
    </div>
  );
}

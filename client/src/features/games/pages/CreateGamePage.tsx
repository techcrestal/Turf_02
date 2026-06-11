import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '../../../api/endpoints/games';
import { sportsApi } from '../../../api/endpoints/sports';
import { turfsApi } from '../../../api/endpoints/turfs';

export default function CreateGamePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    turf_id: '',
    sport_id: '',
    title: '',
    type: 'public' as 'public' | 'private',
    entry_fee: '0',
    max_players: '10',
    start_time: '',
  });
  const [error, setError] = useState('');

  const { data: sports = [] } = useQuery({ queryKey: ['sports'], queryFn: sportsApi.getSports });
  const { data: turfs = [] } = useQuery({ queryKey: ['turfs'], queryFn: turfsApi.getTurfs });

  const mutation = useMutation({
    mutationFn: () => gamesApi.createGame({
      turf_id: form.turf_id,
      sport_id: form.sport_id,
      title: form.title,
      type: form.type,
      entry_fee: parseFloat(form.entry_fee) || 0,
      max_players: parseInt(form.max_players) || 10,
      start_time: new Date(form.start_time).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-games'] });
      navigate('/my-games');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to create game');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.turf_id || !form.sport_id) {
      setError('Please fill all required fields');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-5 text-white">
        <button onClick={() => navigate(-1)} className="text-emerald-100 text-sm mb-2">← Back</button>
        <h1 className="text-2xl font-extrabold">Create Game</h1>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Turf *</label>
          <select
            value={form.turf_id}
            onChange={(e) => setForm({ ...form, turf_id: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            required
          >
            <option value="">Select turf</option>
            {turfs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Sport *</label>
          <select
            value={form.sport_id}
            onChange={(e) => setForm({ ...form, sport_id: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            required
          >
            <option value="">Select sport</option>
            {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'public' | 'private' })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Max Players</label>
            <input
              type="number"
              value={form.max_players}
              onChange={(e) => setForm({ ...form, max_players: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
        >
          {mutation.isPending ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  );
}

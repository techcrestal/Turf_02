import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ratingsApi } from '../../api/endpoints/ratings';
import StarPicker from './StarPicker';

const PARAMS: { key: string; label: string; emoji: string }[] = [
  { key: 'surface',     label: 'Surface Quality',      emoji: '🏟️' },
  { key: 'facilities',  label: 'Facilities',            emoji: '🚿' },
  { key: 'lighting',    label: 'Lighting',              emoji: '💡' },
  { key: 'cleanliness', label: 'Cleanliness',           emoji: '🧹' },
  { key: 'value',       label: 'Value for Money',       emoji: '💰' },
  { key: 'staff',       label: 'Staff Behaviour',       emoji: '🤝' },
];

interface Props {
  turfId: string;
  turfName: string;
  onClose: () => void;
}

export default function RateTurfModal({ turfId, turfName, onClose }: Props) {
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['my-turf-rating', turfId],
    queryFn: () => ratingsApi.getMyTurfRating(turfId),
  });

  const [stars, setStars] = useState<Record<string, number>>(existing?.parameters ?? {});
  const [review, setReview] = useState(existing?.review ?? '');
  const [saved, setSaved] = useState(false);

  // Sync existing data once loaded
  useState(() => {
    if (existing) {
      setStars(existing.parameters ?? {});
      setReview(existing.review ?? '');
    }
  });

  const mutation = useMutation({
    mutationFn: () => ratingsApi.submitTurfRating(turfId, stars, review || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turf-ratings', turfId] });
      queryClient.invalidateQueries({ queryKey: ['my-turf-rating', turfId] });
      setSaved(true);
      setTimeout(onClose, 1000);
    },
  });

  const rated = Object.values(stars).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg">Rate this Turf</h2>
            <p className="text-sm text-slate-500">{turfName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {PARAMS.map(({ key, label, emoji }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">
                <span className="mr-1.5">{emoji}</span>{label}
              </span>
              <StarPicker
                value={stars[key] ?? 0}
                onChange={(v) => setStars((p) => ({ ...p, [key]: v }))}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Review (optional)</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        {saved && (
          <p className="text-emerald-600 text-sm text-center font-medium">Rating saved!</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={rated === 0 || mutation.isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {mutation.isPending ? 'Saving...' : `Submit Rating${rated < PARAMS.length ? ` (${rated}/${PARAMS.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}

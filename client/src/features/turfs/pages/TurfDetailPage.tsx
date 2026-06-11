import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { turfsApi } from '../../../api/endpoints/turfs';
import { sportsApi } from '../../../api/endpoints/sports';
import { courtsApi } from '../../../api/endpoints/courts';
import { getSportEmoji, turfGradient } from '../../../utils/helpers';

export default function TurfDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activePhoto, setActivePhoto] = useState(0);

  const { data: turf, isLoading } = useQuery({
    queryKey: ['turf', id],
    queryFn: () => turfsApi.getTurfById(id!),
    enabled: !!id,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['turf-photos', id],
    queryFn: () => turfsApi.getTurfPhotos(id!),
    enabled: !!id,
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['courts', id],
    queryFn: () => courtsApi.getCourts(id!),
    enabled: !!id,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const sport = sports.find((s) => s.id === turf?.sport_id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-64 bg-slate-200 animate-pulse" />
        <div className="px-5 py-4 space-y-3">
          <div className="h-6 bg-slate-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
        </div>
      </div>
    );
  }

  if (!turf) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Turf not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* ── Photo Gallery ───────────────────────────────────────── */}
      <div className="relative bg-black">
        {photos.length > 0 ? (
          <>
            {/* Main photo */}
            <div className="relative h-64 lg:h-80 overflow-hidden">
              <img
                src={photos[activePhoto]?.url}
                alt={`${turf.name} photo ${activePhoto + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              {/* Counter badge */}
              <span className="absolute top-14 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {activePhoto + 1}/{photos.length}
              </span>
              {/* Prev button */}
              {activePhoto > 0 && (
                <button
                  onClick={() => setActivePhoto((p) => p - 1)}
                  className="absolute left-14 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
                >
                  ‹
                </button>
              )}
              {/* Next button */}
              {activePhoto < photos.length - 1 && (
                <button
                  onClick={() => setActivePhoto((p) => p + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
                >
                  ›
                </button>
              )}
            </div>
            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-1.5 px-2 py-2 overflow-x-auto bg-black/80 no-scrollbar">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePhoto(i)}
                    className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all ${
                      i === activePhoto ? 'border-emerald-400' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Fallback gradient if no photos */
          <div className={`h-64 bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center`}>
            <span className="text-7xl">{getSportEmoji(sport?.name ?? '')}</span>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
        >
          ←
        </button>
      </div>

      {/* ── Turf Info ───────────────────────────────────────────── */}
      <div className="px-5 py-5 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">{turf.name}</h1>
            <p className="text-slate-500 text-sm mt-1">📍 {turf.address}, {turf.city}</p>
          </div>
          <span className={`flex-shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            turf.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${turf.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {turf.status === 'active' ? 'Open' : 'Closed'}
          </span>
        </div>

        {sport && (
          <span className="inline-block mt-3 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
            {getSportEmoji(sport.name)} {sport.name}
          </span>
        )}

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Price/hr</p>
            <p className="text-base font-bold text-emerald-700">₹{turf.price_per_hour}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Capacity</p>
            <p className="text-base font-bold text-slate-700">👥 {turf.capacity}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Courts</p>
            <p className="text-base font-bold text-slate-700">🏟️ {courts.length}</p>
          </div>
        </div>

        {(turf.opening_time || turf.closing_time) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <span>🕐</span>
            <span>{turf.opening_time ?? '--'} – {turf.closing_time ?? '--'}</span>
          </div>
        )}

        {turf.description && (
          <div className="mt-4">
            <h3 className="font-semibold text-slate-700 mb-1 text-sm">About</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{turf.description}</p>
          </div>
        )}

        {(turf.contact_number || turf.turf_email) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {turf.contact_number && (
              <a href={`tel:${turf.contact_number}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600">
                📞 {turf.contact_number}
              </a>
            )}
            {turf.turf_email && (
              <a href={`mailto:${turf.turf_email}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600">
                ✉️ {turf.turf_email}
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Courts ──────────────────────────────────────────────── */}
      {courts.length > 0 && (
        <div className="px-5 py-4">
          <h2 className="text-base font-bold text-slate-800 mb-3">Available Courts</h2>
          <div className="space-y-3">
            {courts.map((court) => {
              const slots = court.court_time_slots ?? [];
              const minPrice = slots.length > 0
                ? Math.min(...slots.map((s) => s.price_per_slot))
                : null;

              return (
                <div key={court.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{court.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                          {court.size}
                        </span>
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                          {court.court_type}
                        </span>
                      </div>
                    </div>
                    {minPrice !== null && (
                      <div className="text-right">
                        <p className="text-xs text-slate-400">from</p>
                        <p className="text-sm font-bold text-emerald-600">₹{minPrice}</p>
                        <p className="text-xs text-slate-400">per slot</p>
                      </div>
                    )}
                  </div>
                  {court.description && (
                    <p className="text-xs text-slate-400 mt-2">{court.description}</p>
                  )}
                  {slots.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Array.from(new Set(slots.map((s) => `${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)}`))).slice(0, 4).map((label) => (
                        <span key={label} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                          {label}
                        </span>
                      ))}
                      {new Set(slots.map((s) => `${s.start_time}–${s.end_time}`)).size > 4 && (
                        <span className="text-xs text-slate-400">+more</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Book Button ─────────────────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 px-5 pb-2 bg-gradient-to-t from-white via-white to-transparent pt-4">
        <button
          onClick={() => navigate(`/book/${turf.id}`)}
          disabled={turf.status !== 'active'}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg text-base transition-colors"
        >
          {turf.status === 'active' ? '🏟️ Book This Turf' : 'Currently Unavailable'}
        </button>
      </div>
    </div>
  );
}

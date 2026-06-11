import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ownerTurfsApi, BookingRecord } from '../../../api/endpoints/ownerTurfs';
import { courtsApi, Court } from '../../../api/endpoints/courts';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji, turfGradient, formatDate, formatTime } from '../../../utils/helpers';
import { SUPABASE_URL, ANON_KEY, deleteTurfPhoto } from '../../../lib/supabaseStorage';

interface TurfPhoto {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white';
const labelCls = 'text-sm font-medium text-slate-700 mb-1 block';

export default function ManageTurfPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const { data: turfs = [], isLoading: turfsLoading } = useQuery({
    queryKey: ['my-turfs'],
    queryFn: ownerTurfsApi.getMyTurfs,
  });

  const turf = turfs.find((t) => t.id === id);

  const [editForm, setEditForm] = useState<{
    name: string;
    sport_id: string;
    description: string;
    address: string;
    city: string;
    state: string;
    country: string;
    price_per_hour: string;
    capacity: string;
    is_public: boolean;
  } | null>(null);

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const { data: courts = [], isLoading: courtsLoading } = useQuery({
    queryKey: ['courts', id],
    queryFn: () => courtsApi.getCourts(id!),
    enabled: !!id,
  });

  const { data: turfPhotos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['turf-photos', id],
    queryFn: async (): Promise<TurfPhoto[]> => {
      const token = localStorage.getItem('turf_token');
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/turf_photos?turf_id=eq.${id}&order=sort_order.asc`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${token ?? ANON_KEY}`,
          },
        }
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['turf-bookings', id],
    queryFn: () => ownerTurfsApi.getBookingRecords(id!),
    enabled: !!id,
  });

  const sportMap = Object.fromEntries(sports.map((s) => [s.id, s]));
  const sport = turf ? sportMap[turf.sport_id] : null;

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof ownerTurfsApi.updateTurf>[1]) =>
      ownerTurfsApi.updateTurf(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-turfs'] });
      setEditOpen(false);
      showToast('Turf updated successfully!');
    },
    onError: (err: any) => {
      setEditErrors({ submit: err?.response?.data?.message ?? 'Update failed.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => ownerTurfsApi.deleteTurf(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-turfs'] });
      navigate('/owner/turfs', { replace: true });
    },
    onError: () => showToast('Failed to delete turf'),
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDeletePhoto = async (photo: TurfPhoto) => {
    try {
      const token = localStorage.getItem('turf_token');
      await deleteTurfPhoto(photo.url);
      await fetch(`${SUPABASE_URL}/rest/v1/turf_photos?id=eq.${photo.id}`, {
        method: 'DELETE',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token ?? ANON_KEY}`,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['turf-photos', id] });
      showToast('Photo removed');
    } catch {
      showToast('Failed to remove photo');
    }
  };

  const openEdit = () => {
    if (!turf) return;
    setEditForm({
      name: turf.name,
      sport_id: turf.sport_id,
      description: turf.description ?? '',
      address: turf.address ?? '',
      city: turf.city ?? '',
      state: turf.state ?? '',
      country: turf.country ?? 'India',
      price_per_hour: String(turf.price_per_hour),
      capacity: String(turf.capacity),
      is_public: turf.is_public,
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    const errs: Record<string, string> = {};
    if (!editForm.name.trim()) errs.name = 'Name is required';
    if (!editForm.city.trim()) errs.city = 'City is required';
    if (!editForm.price_per_hour || Number(editForm.price_per_hour) <= 0) errs.price_per_hour = 'Enter valid price';
    if (!editForm.capacity || Number(editForm.capacity) <= 0) errs.capacity = 'Enter valid capacity';
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    updateMutation.mutate({
      name: editForm.name.trim(),
      sport_id: editForm.sport_id,
      description: editForm.description.trim() || undefined,
      address: editForm.address.trim() || undefined,
      city: editForm.city.trim(),
      state: editForm.state.trim() || undefined,
      country: editForm.country.trim() || 'India',
      price_per_hour: Number(editForm.price_per_hour),
      capacity: Number(editForm.capacity),
      is_public: editForm.is_public,
    });
  };

  const setField = (key: string, value: string | boolean) =>
    setEditForm((prev) => prev ? { ...prev, [key]: value } : prev);

  const bookingStatusStyle = (status: string) => {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (turfsLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-40 bg-slate-200 animate-pulse" />
        <div className="px-5 py-4 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />)}
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
    <div className="min-h-screen bg-white pb-28">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Turf?</h3>
            <p className="text-slate-500 text-sm mb-6">This will permanently remove "{turf.name}" and all its data. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className={`h-44 bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center relative`}>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 bg-black/30 text-white rounded-full flex items-center justify-center"
        >
          ←
        </button>
        <span className="text-6xl">{getSportEmoji(sport?.name ?? '')}</span>
        <span className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${turf.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'}`}>
          {turf.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Turf details */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">{turf.name}</h1>
          {turf.description && <p className="text-slate-500 text-sm mt-1">{turf.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-0.5">Sport</p>
            <p className="font-semibold text-slate-700 text-sm">{getSportEmoji(sport?.name ?? '')} {sport?.name ?? '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-0.5">City</p>
            <p className="font-semibold text-slate-700 text-sm">📍 {turf.city ?? '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-0.5">Price/hr</p>
            <p className="font-semibold text-emerald-600 text-sm">₹{turf.price_per_hour}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-0.5">Capacity</p>
            <p className="font-semibold text-slate-700 text-sm">👥 {turf.capacity} players</p>
          </div>
          {turf.contact_number && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-0.5">Contact</p>
              <p className="font-semibold text-slate-700 text-sm">📞 {turf.contact_number}</p>
            </div>
          )}
          {turf.turf_email && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-0.5">Email</p>
              <p className="font-semibold text-slate-700 text-sm truncate">✉️ {turf.turf_email}</p>
            </div>
          )}
          {turf.opening_time && turf.closing_time && (
            <div className="bg-slate-50 rounded-xl p-3 col-span-2">
              <p className="text-xs text-slate-500 mb-0.5">Hours</p>
              <p className="font-semibold text-slate-700 text-sm">⏰ {turf.opening_time} – {turf.closing_time}</p>
            </div>
          )}
        </div>

        {/* Toggle status */}
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Turf Status</p>
            <p className="text-xs text-slate-400">{turf.is_active ? 'Visible to players' : 'Hidden from players'}</p>
          </div>
          <button
            onClick={() => updateMutation.mutate({ is_active: !turf.is_active } as any)}
            disabled={updateMutation.isPending}
            className={`w-12 h-6 rounded-full transition-colors relative disabled:opacity-50 ${turf.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${turf.is_active ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Edit section */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => editOpen ? setEditOpen(false) : openEdit()}
            className="w-full flex items-center justify-between px-4 py-4 bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-700">✏️ Edit Turf Details</span>
            <span className="text-slate-400 text-sm">{editOpen ? '▲' : '▼'}</span>
          </button>

          {editOpen && editForm && (
            <form onSubmit={handleEditSubmit} className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
              <div>
                <label className={labelCls}>Turf Name *</label>
                <input type="text" value={editForm.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
                {editErrors.name && <p className="text-red-500 text-xs mt-1">{editErrors.name}</p>}
              </div>
              <div>
                <label className={labelCls}>Sport</label>
                <select value={editForm.sport_id} onChange={(e) => setField('sport_id', e.target.value)} className={inputCls}>
                  {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={editForm.description} onChange={(e) => setField('description', e.target.value)} rows={3} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input type="text" value={editForm.address} onChange={(e) => setField('address', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input type="text" value={editForm.city} onChange={(e) => setField('city', e.target.value)} className={inputCls} />
                {editErrors.city && <p className="text-red-500 text-xs mt-1">{editErrors.city}</p>}
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input type="text" value={editForm.state} onChange={(e) => setField('state', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input type="text" value={editForm.country} onChange={(e) => setField('country', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Price Per Hour (₹) *</label>
                <input type="number" min="0" value={editForm.price_per_hour} onChange={(e) => setField('price_per_hour', e.target.value)} className={inputCls} />
                {editErrors.price_per_hour && <p className="text-red-500 text-xs mt-1">{editErrors.price_per_hour}</p>}
              </div>
              <div>
                <label className={labelCls}>Capacity *</label>
                <input type="number" min="1" value={editForm.capacity} onChange={(e) => setField('capacity', e.target.value)} className={inputCls} />
                {editErrors.capacity && <p className="text-red-500 text-xs mt-1">{editErrors.capacity}</p>}
              </div>
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-slate-700">Publicly Listed</p>
                <button
                  type="button"
                  onClick={() => setField('is_public', !editForm.is_public)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editForm.is_public ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${editForm.is_public ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              {editErrors.submit && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{editErrors.submit}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditOpen(false)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Courts section */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 mb-3">Courts</h2>
          {courtsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-sm">No courts added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(courts as Court[]).map((court) => {
                const slots = court.court_time_slots ?? [];
                return (
                  <div key={court.id} className="border-l-4 border-emerald-500 bg-white rounded-xl shadow-sm p-4">
                    <p className="font-semibold text-slate-800 text-sm">{court.name}</p>
                    <p className="text-xs text-slate-400 mb-2">{court.size} • {court.court_type}</p>
                    {court.description && (
                      <p className="text-xs text-slate-500 mb-2">{court.description}</p>
                    )}
                    {slots.length > 0 && (
                      <div className="space-y-1">
                        {slots.map((slot, si) => (
                          <div key={slot.id ?? si} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1">
                            <span className="font-medium">{DAYS[slot.day_of_week]}</span>
                            <span>{slot.start_time} – {slot.end_time}</span>
                            <span className="text-emerald-600 font-semibold ml-auto">₹{slot.price_per_slot}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Photos section */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 mb-3">Photos</h2>
          {photosLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : turfPhotos.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-sm">No photos uploaded</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(turfPhotos as TurfPhoto[]).map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={photo.url} alt="Turf" className="w-full h-full object-cover" />
                  {photo.is_primary && (
                    <span className="absolute top-1 left-1 bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                  <button
                    onClick={() => handleDeletePhoto(photo)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings section */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 mb-3">Bookings</h2>
          {bookingsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-sm">No bookings yet for this turf</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking: BookingRecord) => (
                <div key={booking.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formatDate(booking.start_time)}</p>
                      <p className="text-xs text-slate-500">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">User: {booking.user_id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="text-sm font-bold text-emerald-600">₹{booking.total_price}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bookingStatusStyle(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete button */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl transition-colors"
          >
            🗑️ Delete Turf
          </button>
        </div>
      </div>
    </div>
  );
}

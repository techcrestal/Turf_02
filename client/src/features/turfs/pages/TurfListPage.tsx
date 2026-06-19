import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { turfsApi } from '../../../api/endpoints/turfs';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji, turfGradient } from '../../../utils/helpers';
import { haversineKm, getCurrentPosition } from '../../../utils/geo';
import { useAuth } from '../../../context/AuthContext';

const RADII = [5, 10, 25, 50] as const;
type Radius = typeof RADII[number];

export default function TurfListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [radius, setRadius] = useState<Radius>(10);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const { data: turfs = [], isLoading } = useQuery({
    queryKey: ['turfs'],
    queryFn: turfsApi.getTurfs,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const sportMap = Object.fromEntries(sports.map((s) => [s.id, s]));

  // Reference point for distance: user's saved home > browser GPS > nothing
  const refLat = currentPos?.lat ?? user?.home_lat ?? null;
  const refLng = currentPos?.lng ?? user?.home_lng ?? null;
  const hasRef = refLat != null && refLng != null;

  const enableNearby = async () => {
    if (user?.home_lat && user?.home_lng) {
      // Use saved home location — no GPS needed
      setNearbyEnabled(true);
      return;
    }
    // Fall back to browser GPS
    setDetectingGps(true);
    setGpsError('');
    try {
      const pos = await getCurrentPosition();
      setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setNearbyEnabled(true);
    } catch {
      setGpsError('Location access denied. Set a home location in your profile to use this filter.');
    } finally {
      setDetectingGps(false);
    }
  };

  const disableNearby = () => {
    setNearbyEnabled(false);
    setCurrentPos(null);
    setGpsError('');
  };

  // Apply filters
  let filtered = activeSport ? turfs.filter((t) => t.sport_id === activeSport) : turfs;

  if (nearbyEnabled && hasRef) {
    filtered = filtered.filter((t) => {
      if (t.latitude == null || t.longitude == null) return false;
      return haversineKm(refLat!, refLng!, Number(t.latitude), Number(t.longitude)) <= radius;
    });
  }

  const locationLabel = currentPos
    ? 'your current location'
    : user?.home_lat
    ? 'your home'
    : '';

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-5 text-white lg:pt-8">
        <h1 className="text-2xl font-extrabold">Browse Turfs</h1>
        <p className="text-emerald-100 text-sm">Find the perfect turf near you</p>
      </div>

      <div className="px-4 py-4 space-y-3 lg:px-10 lg:py-6">
        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:flex-wrap lg:overflow-x-visible">
          <button
            onClick={() => setActiveSport(null)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !activeSport ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            All
          </button>
          {sports.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSport(activeSport === s.id ? null : s.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeSport === s.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {getSportEmoji(s.name)} {s.name}
            </button>
          ))}
        </div>

        {/* Nearby filter bar */}
        <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Nearby Turfs</p>
                {nearbyEnabled && hasRef && (
                  <p className="text-xs text-slate-400">
                    Within {radius} km of {locationLabel}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={nearbyEnabled ? disableNearby : enableNearby}
              disabled={detectingGps}
              className={`w-12 h-6 rounded-full transition-colors relative disabled:opacity-50 ${nearbyEnabled && hasRef ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${nearbyEnabled && hasRef ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          {detectingGps && (
            <p className="text-xs text-emerald-600 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
              Detecting location…
            </p>
          )}

          {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}

          {nearbyEnabled && hasRef && (
            <div className="flex gap-2">
              {RADII.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    radius === r
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Turf grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="text-slate-500 font-medium">
              {nearbyEnabled ? `No turfs within ${radius} km` : 'No turfs found'}
            </p>
            <p className="text-slate-400 text-sm">
              {nearbyEnabled ? 'Try increasing the radius or disabling the nearby filter' : 'Try a different sport filter'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((turf) => {
              const sport = sportMap[turf.sport_id];
              const dist =
                nearbyEnabled && hasRef && turf.latitude != null && turf.longitude != null
                  ? haversineKm(refLat!, refLng!, Number(turf.latitude), Number(turf.longitude))
                  : null;
              return (
                <div
                  key={turf.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  <div className={`h-24 bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center text-4xl`}>
                    {getSportEmoji(sport?.name ?? '')}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{turf.name}</h3>
                    <p className="text-slate-400 text-xs truncate">{turf.city}</p>
                    {dist != null && (
                      <p className="text-emerald-600 text-xs font-medium mt-0.5">
                        📍 {dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`} away
                      </p>
                    )}
                    {turf.starting_from_price != null && (
                      <p className="text-emerald-600 font-bold text-sm mt-1">From ₹{turf.starting_from_price}/slot</p>
                    )}
                    <button
                      onClick={() => navigate(`/turfs/${turf.id}`)}
                      className="mt-2 w-full bg-emerald-50 text-emerald-700 text-xs py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

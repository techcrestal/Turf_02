import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { getCurrentPosition } from '../../utils/geo';

// Set API key once when the module loads (before any importLibrary call)
setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  v: 'weekly',
});

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  label?: string;
  required?: boolean;
}

export default function LocationPicker({ lat, lng, onChange, label, required }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [loaded, setLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');

  // Keep onChange ref fresh so dragend never uses a stale closure
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Init map once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ Map }, { Marker }] = await Promise.all([
          importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
        ]);
        if (cancelled || !mapRef.current) return;

        const center = lat != null && lng != null ? { lat, lng } : INDIA_CENTER;
        const zoom = lat != null && lng != null ? 15 : 5;

        const map = new Map(mapRef.current, {
          center,
          zoom,
          clickableIcons: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        });
        mapInstance.current = map;

        // Click on map to drop/move marker
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          placeOrMoveMarker(map, Marker, e.latLng);
          onChangeRef.current(e.latLng.lat(), e.latLng.lng());
        });

        // Drop initial marker if coordinates provided
        if (lat != null && lng != null) {
          placeOrMoveMarker(map, Marker, new google.maps.LatLng(lat, lng));
        }

        setLoaded(true);
      } catch {
        setError('Failed to load Google Maps. Please refresh and try again.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeOrMoveMarker(
    map: google.maps.Map,
    Marker: typeof google.maps.Marker,
    position: google.maps.LatLng
  ) {
    if (markerInstance.current) {
      markerInstance.current.setPosition(position);
    } else {
      const marker = new Marker({
        position,
        map,
        draggable: true,
        title: 'Drag to adjust location',
        animation: google.maps.Animation.DROP,
      });
      markerInstance.current = marker;
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) onChangeRef.current(pos.lat(), pos.lng());
      });
    }
    map.panTo(position);
  }

  // Sync external lat/lng changes (e.g. after "Use my location") to the map
  useEffect(() => {
    if (!loaded || !mapInstance.current || lat == null || lng == null) return;
    const pos = new google.maps.LatLng(lat, lng);
    // Marker may not exist yet if we got here before the init effect finished
    if (markerInstance.current) {
      markerInstance.current.setPosition(pos);
      mapInstance.current.panTo(pos);
      mapInstance.current.setZoom(15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, loaded]);

  const handleUseMyLocation = async () => {
    setDetecting(true);
    setError('');
    try {
      const pos = await getCurrentPosition();
      onChange(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setError('Could not get your location — please allow location access and try again.');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
      )}

      <div className="relative rounded-xl overflow-hidden border border-slate-200" style={{ height: 280 }}>
        <div ref={mapRef} className="w-full h-full" />
        {!loaded && !error && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center p-4">
            <p className="text-red-500 text-sm text-center">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={detecting || !loaded}
          className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
        >
          {detecting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
              Detecting…
            </>
          ) : (
            '📍 Use my current location'
          )}
        </button>
        {lat != null && lng != null && (
          <span className="text-xs text-slate-400 font-mono">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        )}
      </div>

      {lat == null && (
        <p className="text-xs text-slate-400">
          Tap the map to drop a pin, or click "Use my current location"
        </p>
      )}
    </div>
  );
}

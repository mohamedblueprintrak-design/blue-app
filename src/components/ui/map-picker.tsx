"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, LocateFixed, X } from "lucide-react";

// Fix leaflet default marker icon issue in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RAK_CENTER: [number, number] = [25.7895, 55.9432]; // Ras Al Khaimah

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (value: { lat: number; lng: number } | null) => void;
  label?: string;
  height?: string;
}

function LocationMarker({
  position,
  onChange,
}: {
  position: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? (
    <Marker
      position={position}
      icon={DefaultIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
        },
      }}
    />
  ) : null;
}

// FlyTo using useEffect to avoid accessing refs during render
function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (position && (prevRef.current?.lat !== position[0] || prevRef.current?.lng !== position[1])) {
      prevRef.current = { lat: position[0], lng: position[1] };
      requestAnimationFrame(() => {
        map.flyTo(position, 15, { duration: 0.8 });
      });
    }
  }, [position, map]);

  return null;
}

function AutoInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 200),
      setTimeout(() => map.invalidateSize(), 500),
      setTimeout(() => map.invalidateSize(), 1000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, [map]);
  return null;
}


// Client-side only wrapper to handle SSR gracefully
function ClientOnlyWrapper({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (isMountedRef.current) {
        setMounted(true);
      }
    });
    return () => {
      isMountedRef.current = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

export default function MapPicker({
  value,
  onChange,
  label = "حدد موقع المشروع على الخريطة",
  height = "300px",
}: MapPickerProps) {
  // Compute position from value prop, avoiding unnecessary state updates.
  // We use a ref to track the last synced value to prevent stale closures,
  // and derive the display position from the value prop directly.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const _lastValueRef = useRef<{ lat: number; lng: number } | null>(null);
  const [mountedPosition, setMountedPosition] = useState<[number, number] | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync position from external value changes.
  // Uses requestAnimationFrame to defer the state update out of the
  // synchronous effect phase, avoiding the cascading-render lint error.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (!isMountedRef.current) return;
      const v = valueRef.current;
      setMountedPosition(prev => {
        if (v) {
          if (prev && prev[0] === v.lat && prev[1] === v.lng) return prev;
          return [v.lat, v.lng] as [number, number];
        }
        return null;
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [value?.lat, value?.lng]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!isMountedRef.current) return;
      setMountedPosition([lat, lng]);
      onChange({ lat, lng });
    },
    [onChange]
  );

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMountedRef.current) return;
        const { latitude, longitude } = pos.coords;
        handleMapClick(latitude, longitude);
      },
      () => {
        if (!isMountedRef.current) return;
        // Fallback to RAK center
        handleMapClick(RAK_CENTER[0], RAK_CENTER[1]);
      }
    );
  }, [handleMapClick]);

  const handleClear = useCallback(() => {
    setMountedPosition(null);
    onChange(null);
  }, [onChange]);

  const mapContent = (
    <div
      className="w-full rounded-lg border border-slate-200 overflow-hidden"
      style={{ height }}
    >
      <MapContainer
        center={mountedPosition || RAK_CENTER}
        zoom={mountedPosition ? 15 : 11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          position={mountedPosition}
          onChange={handleMapClick}
        />
        <FlyToLocation position={mountedPosition} />
        <AutoInvalidateSize />
      </MapContainer>
    </div>
  );

  const fallbackContent = (
    <div
      className="w-full rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-sm"
      style={{ height }}
    >
      <MapPin className="w-6 h-6 me-2 animate-pulse" />
      جارٍ تحميل الخريطة...
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-navy-500" />
          {label}
        </label>
        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              إزالة
            </button>
          )}
          <button
            type="button"
            onClick={handleGeolocate}
            className="text-xs text-brand-navy-600 hover:text-brand-navy-800 flex items-center gap-1 transition-colors"
          >
            <LocateFixed className="w-3 h-3" />
            موقعي الحالي
          </button>
        </div>
      </div>

      <ClientOnlyWrapper fallback={fallbackContent}>
        {mapContent}
      </ClientOnlyWrapper>

      <p className="text-xs text-slate-400">
        {value
          ? `الإحداثيات: ${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`
          : "اضغط على الخريطة لتحديد موقع المشروع، أو استخدم زر (موقعي الحالي)"}
      </p>
    </div>
  );
}

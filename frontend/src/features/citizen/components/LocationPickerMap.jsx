import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, AlertCircle, Compass } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

// Custom clean civic marker icon avoiding Vite asset URL issues
const createCivicPinIcon = () =>
  L.divIcon({
    className: 'civic-map-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: #7C97B0;
        border: 2px solid #FFFFFF;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 8px rgba(0,0,0,0.25);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: #FFFFFF;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

export function LocationPickerMap({
  coordinates = { lat: 28.6139, lng: 77.2090 },
  onCoordinatesChange,
  address = '',
  onAddressChange,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);

  const [geoError, setGeoError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = coordinates?.lat || 28.6139;
    const initialLng = coordinates?.lng || 77.2090;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Initial Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createCivicPinIcon(),
      draggable: true,
    }).addTo(map);

    // Event: Click on map to move marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      if (onCoordinatesChangeRef.current) {
        onCoordinatesChangeRef.current({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      }
    });

    // Event: Drag marker
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      if (onCoordinatesChangeRef.current) {
        onCoordinatesChangeRef.current({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external coordinates change to map marker
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (coordinates?.lat && coordinates?.lng) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - coordinates.lat) > 0.0001 ||
        Math.abs(currentPos.lng - coordinates.lng) > 0.0001
      ) {
        markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
        mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], 15);
      }
    }
  }, [coordinates?.lat, coordinates?.lng]);

  // Request browser geolocation
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const newCoords = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };

        if (onCoordinatesChangeRef.current) {
          onCoordinatesChangeRef.current(newCoords);
        }

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([newCoords.lat, newCoords.lng]);
          mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 16);
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'Failed to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access denied. Please click on the map to set your location.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setGeoError(errorMsg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="block text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
            Incident Location & GPS Coordinates <span className="text-red-500">*</span>
          </span>
          <p className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Pin the exact location on the map, or use your device&apos;s GPS.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isLocating}
          icon={<Navigation className="w-3.5 h-3.5 text-[#7C97B0] dark:text-[#8FAFCB]" />}
          onClick={handleDetectLocation}
        >
          Detect My Location
        </Button>
      </div>

      {geoError && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Leaflet Map Box */}
      <div className="relative rounded-xl overflow-hidden border border-[#E1E7EE] dark:border-[#40515F] shadow-inner">
        <div ref={mapContainerRef} className="h-64 sm:h-72 w-full z-0" />
        
        {/* Floating Coordinates Tag */}
        <div className="absolute bottom-2 left-2 z-[400] bg-white/95 dark:bg-[#202C38]/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-mono text-[#2E4A62] dark:text-[#F2F5F8] border border-[#E1E7EE] dark:border-[#40515F] shadow-xs flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#7C97B0] dark:text-[#8FAFCB]" />
          <span>
            {coordinates?.lat?.toFixed(5) || '0.00000'}, {coordinates?.lng?.toFixed(5) || '0.00000'}
          </span>
        </div>
      </div>

      {/* Landmark / Street address input */}
      <div>
        <label htmlFor="landmark-address-input" className="block text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-1">
          Street Address / Landmark Description
        </label>
        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
            <MapPin className="w-4 h-4" />
          </div>
          <input
            id="landmark-address-input"
            type="text"
            value={address}
            onChange={(e) => onAddressChange && onAddressChange(e.target.value)}
            placeholder="e.g. Near Metro Pillar 142, Sector 4 Main Road"
            className="block w-full rounded-lg text-sm transition-colors border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] focus:border-[#7C97B0] pl-9 pr-3.5 py-2.5 hover:border-[#7C97B0]/60"
          />
        </div>
      </div>
    </div>
  );
}

export default LocationPickerMap;

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export function GeographicHotspotMap({ hotspots = [], incidents = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Plot Hotspots as density circles
    hotspots.forEach((spot) => {
      const color =
        spot.severityWeight === 'CRITICAL' ? '#C74949' : spot.severityWeight === 'HIGH' ? '#B7791F' : '#7C97B0';

      const circle = L.circle([spot.centerCoordinates.lat, spot.centerCoordinates.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.25,
        radius: 600 + spot.incidentCount * 25,
      }).addTo(map);

      const marker = L.marker([spot.centerCoordinates.lat, spot.centerCoordinates.lng], {
        icon: L.divIcon({
          className: 'civic-hotspot-pin',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              background: ${color};
              color: #ffffff;
              border-radius: 50%;
              font-size: 11px;
              font-weight: 700;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              border: 2px solid #ffffff;
            ">
              ${spot.incidentCount}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map);

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; color: #2E4A62; line-height: 1.4;">
          <b style="color: #2E4A62; font-size: 13px;">${spot.ward}</b><br>
          <span style="color: #64748b;">Zone: ${spot.zone}</span><br>
          <span style="color: #64748b;">Dominant Issue: <b>${spot.category}</b></span><br>
          <span>Aggregated Incident Count: <b>${spot.incidentCount} reports</b></span><br>
          <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #fee2e2; color: #991b1b; border-radius: 4px; font-weight: 600; font-size: 10px;">
            ${spot.isChronicFailure ? 'CHRONIC FAILURE NODE' : 'SEASONAL CLUSTER'}
          </span>
        </div>
      `;

      marker.bindPopup(popupContent);
      circle.bindPopup(popupContent);
    });

    // Also plot recent incident coordinates if available
    incidents.slice(0, 15).forEach((inc) => {
      if (inc.location?.lat && inc.location?.lng) {
        const pin = L.marker([inc.location.lat, inc.location.lng], {
          icon: L.divIcon({
            className: 'civic-incident-small-dot',
            html: `
              <div style="
                width: 10px;
                height: 10px;
                background: #7C97B0;
                border: 1.5px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0,0,0,0.4);
              "></div>
            `,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          }),
        }).addTo(map);

        pin.bindPopup(`
          <div style="font-size: 11px; color: #2E4A62;">
            <b>#${inc.ticketNumber || inc.id}</b>: ${inc.category}<br>
            <span style="color: #64748b;">${inc.location.address || 'Reported Location'}</span>
          </div>
        `);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [hotspots, incidents]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-white dark:bg-[#2D3C49] border-b border-[#E1E7EE] dark:border-[#40515F] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Geospatial Infrastructure Hotspots</CardTitle>
            <Badge variant="primary" size="sm">Density Aggregation</Badge>
          </div>
          <CardDescription>
            Historical density clustering aggregating recurrent civic failure nodes across municipal wards.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#B7C3CE] bg-[#F7F9FB] dark:bg-[#202C38] px-3 py-1.5 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <Info className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
          <span>Calculated from spatial coordinate density (Non-predictive)</span>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative">
        <div ref={mapContainerRef} className="h-80 sm:h-96 w-full z-0" />

        {/* Floating Hotspots Summary Drawer */}
        <div className="p-4 bg-white dark:bg-[#2D3C49] border-t border-[#E1E7EE] dark:border-[#40515F] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {hotspots.map((h) => (
            <div key={h.id} className="p-3 rounded-lg bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">{h.ward}</span>
                <Badge variant={h.severityWeight === 'CRITICAL' ? 'critical' : 'warning'} size="sm">
                  {h.incidentCount} reports
                </Badge>
              </div>
              <span className="text-[#64748B] dark:text-[#B7C3CE] block text-[11px] truncate">{h.category}</span>
              <span className="text-[10px] text-[#64748B] dark:text-[#B7C3CE] font-mono block">
                Coord: {h.centerCoordinates.lat.toFixed(4)}, {h.centerCoordinates.lng.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default GeographicHotspotMap;

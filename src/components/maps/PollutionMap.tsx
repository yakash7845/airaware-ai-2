'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ComparedLocationSnapshot } from '@/types';

interface PollutionMapProps {
  locations: readonly ComparedLocationSnapshot[];
  selectedName: string;
  onSelectLocation: (loc: ComparedLocationSnapshot) => void;
}

export default function PollutionMap({
  locations,
  selectedName,
  onSelectLocation,
}: PollutionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [13.08, 80.27],
      zoom: 5,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    for (const item of locations) {
      const { location, computedAqi } = item;
      const latLng: [number, number] = [location.latitude, location.longitude];
      bounds.push(latLng);

      const isSelected = location.name.toLowerCase() === selectedName.toLowerCase();
      const color = computedAqi.categoryColor ?? '#64748b';
      const valText = computedAqi.value !== null ? String(computedAqi.value) : '--';

      // ~22.5 km radius circle representing ~45 km CAMS model grid footprint
      L.circle(latLng, {
        radius: 22_500,
        color,
        weight: isSelected ? 2 : 1,
        dashArray: '5 5',
        fillColor: color,
        fillOpacity: isSelected ? 0.18 : 0.08,
      }).addTo(group);

      const icon = L.divIcon({
        className: 'airaware-map-marker',
        html: `<div style="background:${color};color:#fff;border:2px solid #fff;border-radius:9999px;padding:3px 9px;font-size:11px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">${location.name}: ${valText}</div>`,
        iconSize: [120, 28],
        iconAnchor: [60, 14],
      });

      const marker = L.marker(latLng, { icon }).addTo(group);
      marker.on('click', () => onSelectLocation(item));
      marker.bindPopup(
        `<div style="font-size:12px;"><strong>${location.name}</strong><br/>Indicative IN NAQI: <strong>${valText}</strong> (${computedAqi.categoryLabel ?? 'Unavailable'})<br/>PM2.5: ${item.pm25 ?? '--'} µg/m³<br/><span style="color:#475569;font-size:11px;">~45 km CAMS Regional Model Grid</span></div>`
      );
    }

    if (bounds.length === 1 && bounds[0]) {
      map.setView(bounds[0], 9);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 9 });
    }
  }, [locations, selectedName, onSelectLocation]);

  return (
    <div
      ref={containerRef}
      aria-label="Interactive regional air quality map"
      className="w-full h-[360px] sm:h-[420px] rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 z-0"
    />
  );
}

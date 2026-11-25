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

/** Escape untrusted text before inserting into Leaflet HTML icon/popup strings. */
export function escapeMapHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMarkerElement(label: string, valueText: string, color: string): HTMLDivElement {
  const badge = document.createElement('div');
  badge.style.background = color;
  badge.style.color = '#ffffff';
  badge.style.border = '2px solid #ffffff';
  badge.style.borderRadius = '9999px';
  badge.style.padding = '3px 9px';
  badge.style.fontSize = '11px';
  badge.style.fontWeight = '800';
  badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  badge.style.whiteSpace = 'nowrap';
  badge.textContent = `${label}: ${valueText}`;
  return badge;
}

function buildPopupElement(item: ComparedLocationSnapshot, valueText: string): HTMLDivElement {
  const root = document.createElement('div');
  root.style.fontSize = '12px';

  const title = document.createElement('strong');
  title.textContent = item.location.name;
  root.appendChild(title);
  root.appendChild(document.createElement('br'));

  const line1 = document.createElement('span');
  line1.textContent = `Indicative IN NAQI: ${valueText} (${item.computedAqi.categoryLabel ?? 'Unavailable'})`;
  root.appendChild(line1);
  root.appendChild(document.createElement('br'));

  const line2 = document.createElement('span');
  line2.textContent = `PM2.5: ${item.pm25 ?? '--'} µg/m³`;
  root.appendChild(line2);
  root.appendChild(document.createElement('br'));

  const note = document.createElement('span');
  note.style.color = '#475569';
  note.style.fontSize = '11px';
  note.textContent = '~45 km CAMS Regional Model Grid';
  root.appendChild(note);

  return root;
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

      L.circle(latLng, {
        radius: 22_500,
        color,
        weight: isSelected ? 2 : 1,
        dashArray: '5 5',
        fillColor: color,
        fillOpacity: isSelected ? 0.18 : 0.08,
      }).addTo(group);

      const markerEl = buildMarkerElement(location.name, valText, color);
      const icon = L.divIcon({
        className: 'airaware-map-marker',
        html: markerEl.outerHTML,
        iconSize: [120, 28],
        iconAnchor: [60, 14],
      });

      const marker = L.marker(latLng, { icon }).addTo(group);
      marker.on('click', () => onSelectLocation(item));
      marker.bindPopup(buildPopupElement(item, valText));
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
      role="region"
      aria-label="Interactive regional air quality map"
      className="w-full h-[360px] sm:h-[420px] rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 z-0"
    />
  );
}

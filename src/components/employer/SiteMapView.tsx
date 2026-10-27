import React, { useState, useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import { SECTOR_CONFIGS } from '../../config/siteRules';
import { Badge } from '../ui/Badge';
import { 
  MapPin, 
  ShieldCheck, 
  Globe, 
  WifiOff, 
  AlertCircle, 
  ExternalLink,
  Compass,
  Building2,
  FileText
} from 'lucide-react';

interface SiteMapViewProps {
  siteId: string;
}

export const SiteMapView: React.FC<SiteMapViewProps> = ({ siteId }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Leaflet.Map | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  const siteConfig = SECTOR_CONFIGS[siteId] || SECTOR_CONFIGS['site-metro-const'];
  const { geofence } = siteConfig.rules;

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Lazy-load Leaflet and OpenStreetMap tiles dynamically
  useEffect(() => {
    let isCancelled = false;

    if (isOffline) {
      setMapError(true);
      setLoading(false);
      return;
    }

    const initLeafletMap = async () => {
      setLoading(true);
      setMapError(false);

      try {
        // Dynamically import Leaflet
        const L = (await import('leaflet')).default;

        // Ensure Leaflet CSS is present in head
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (isCancelled || !mapContainerRef.current) return;

        // Cleanup existing map if any
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
          center: [geofence.latitude, geofence.longitude],
          zoom: 15,
          zoomControl: true,
          attributionControl: true,
        });

        // Add OpenStreetMap tiles with visible attribution
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
        });

        tileLayer.on('tileerror', () => {
          console.warn('[FairShift Map] OSM Tile failed to load. Switching to SVG fallback.');
          setMapError(true);
        });

        tileLayer.addTo(map);

        // Custom Teal SVG Marker Icon
        const tealIcon = L.divIcon({
          className: 'custom-site-pin',
          html: `<div style="background-color: #0F766E; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        // Add Site Marker
        const marker = L.marker([geofence.latitude, geofence.longitude], { icon: tealIcon })
          .addTo(map)
          .bindPopup(`<b>${siteConfig.siteName}</b><br/><span style="font-size: 11px;">Geofence Radius: ${geofence.radiusMeters}m</span>`);

        // Add Geofence Circle
        L.circle([geofence.latitude, geofence.longitude], {
          radius: geofence.radiusMeters,
          color: '#0F766E',
          fillColor: '#0F766E',
          fillOpacity: 0.16,
          weight: 2,
          dashArray: '4, 4',
        }).addTo(map);

        mapInstanceRef.current = map;
        setLoading(false);
      } catch (err: unknown) {
        console.warn('[FairShift Map] Leaflet dynamic loading failed, rendering SVG fallback:', err);
        setMapError(true);
        setLoading(false);
      }
    };

    initLeafletMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [siteId, isOffline, geofence.latitude, geofence.longitude, geofence.radiusMeters]);

  return (
    <div className="space-y-6">
      {/* Site Configuration & Geofence Header */}
      <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E0]">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#0F766E]" />
              <h2 className="text-sm font-bold text-[#17181A]">
                Site Setup & Verified Geofence Perimeter
              </h2>
              <Badge variant="teal" label="OpenStreetMap · Leaflet" size="sm" />
            </div>
            <p className="text-xs text-[#73757C] mt-0.5">
              Statutory attendance geofence boundary. Validates worker check-ins with haversine distance verification.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono-code text-[11px] text-[#4A4B4F] bg-[#F1F1ED] px-2 py-1 rounded border border-[#E5E5E0]">
              ID: {siteConfig.id}
            </span>
          </div>
        </div>

        {/* Content Layout: Map on Left / Center, Coordinates & Rules on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 items-start">
          {/* Map Column (Leaflet or SVG Fallback) */}
          <div className="lg:col-span-8 space-y-2">
            <div 
              className="relative w-full h-[360px] rounded-[6px] border border-[#E5E5E0] overflow-hidden bg-[#F4F4F1]"
              aria-label={`Interactive site geofence map showing boundary for ${siteConfig.siteName}`}
              role="region"
            >
              {/* Text alternative for screen readers */}
              <div className="sr-only">
                Geofence perimeter map for {siteConfig.siteName} located at latitude {geofence.latitude}, longitude {geofence.longitude} with an active radius of {geofence.radiusMeters} meters.
              </div>

              {/* Real Leaflet Map Container */}
              {!mapError && !isOffline && (
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-full z-0"
                  tabIndex={0}
                  aria-label="Map view"
                />
              )}

              {/* Loading Indicator */}
              {loading && !mapError && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 text-xs text-[#73757C] gap-2">
                  <div className="w-4 h-4 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading OpenStreetMap tiles...</span>
                </div>
              )}

              {/* SVG Fallback (If tiles fail or offline) */}
              {(mapError || isOffline) && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF9F6] p-4 text-center">
                  <div className="relative w-44 h-44 mb-3 flex items-center justify-center">
                    {/* SVG Geofence Circle Fallback */}
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="42" fill="#0F766E" fillOpacity="0.12" stroke="#0F766E" strokeWidth="2" strokeDasharray="3,3" />
                      <circle cx="50" cy="50" r="4" fill="#0F766E" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <MapPin className="w-6 h-6 text-[#0F766E]" />
                      <span className="text-[10px] font-bold text-[#0F766E] mt-0.5">{geofence.radiusMeters}m Radius</span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-[#17181A]">
                    {isOffline ? 'Offline Mode Active' : 'Offline SVG Geofence Graphic'}
                  </p>
                  <p className="text-[11px] text-[#73757C] max-w-sm mt-0.5">
                    Map tiles unavailable. Haversine distance calculations continue locally using latitude {geofence.latitude} and longitude {geofence.longitude}.
                  </p>
                </div>
              )}
            </div>

            {/* Map Attribution and Privacy Note */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-[#73757C] pt-1">
              <span className="flex items-center gap-1 font-medium">
                © OpenStreetMap contributors
              </span>
              <span className="text-[#0F766E] font-medium">
                Zero worker tracking · Coordinates used for static geofence validation only
              </span>
            </div>
          </div>

          {/* Coordinates & Site Specs Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Geofence Parameters Card */}
            <div className="bg-[#FAF9F6] border border-[#E5E5E0] rounded-[6px] p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-2">
                <span className="font-bold text-[#17181A]">Geofence Verification</span>
                <Badge variant="green" label="Active" size="sm" />
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[11px] text-[#73757C] block">Site Latitude & Longitude</span>
                  <span className="font-mono-code font-semibold text-[#17181A]">
                    {geofence.latitude.toFixed(4)}° N, {geofence.longitude.toFixed(4)}° E
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#73757C] block">Enforced Geofence Radius</span>
                  <span className="font-mono-code font-bold text-sm text-[#0F766E]">
                    {geofence.radiusMeters} meters
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#73757C] block">Site Location</span>
                  <span className="font-medium text-[#17181A]">
                    {siteConfig.location}, {siteConfig.state}
                  </span>
                </div>
              </div>
            </div>

            {/* Applicable Legislation Card */}
            <div className="bg-white border border-[#E5E5E0] rounded-[6px] p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#17181A]">
                <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Applicable Labour Act:</span>
              </div>
              <p className="text-[11px] text-[#4A4B4F] leading-relaxed">
                {siteConfig.applicableAct}
              </p>

              <div className="pt-2 border-t border-[#E5E5E0] text-[10px] text-[#73757C] space-y-1">
                <div>• Standard shift: <strong>{siteConfig.rules.regularShiftHours} hours</strong></div>
                <div>• Overtime rule: <strong>{siteConfig.rules.overtimeMultiplier}x statutory multiplier</strong></div>
                <div>• Minimum turnaround: <strong>{siteConfig.rules.minRestGapHours}h rest gap</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

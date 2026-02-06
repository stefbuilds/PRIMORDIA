'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Region, Overlay } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapProps {
  selectedRegion: Region | null;
  onRegionSelect: (region: Region) => void;
  regions: Region[];
  mapStyle?: 'satellite' | 'globe';
  overlay?: Overlay | null;
  showOverlay?: boolean;
}

type ViewMode = 'globe' | 'detailed';

export default function Map({ selectedRegion, onRegionSelect, regions, mapStyle = 'satellite', overlay, showOverlay = false }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(mapStyle === 'globe' ? 'globe' : 'detailed');
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const overlaySourceId = 'anomaly-overlay';
  const overlayLayerId = 'anomaly-overlay-layer';

  // Format coordinates to DMS (Degrees Minutes Seconds)
  const formatDMS = (decimal: number, isLat: boolean) => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
    const direction = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  // Format to MGRS-like grid reference (simplified)
  const formatGridRef = (lat: number, lng: number) => {
    // Simplified UTM zone calculation
    const zone = Math.floor((lng + 180) / 6) + 1;
    const band = 'CDEFGHJKLMNPQRSTUVWX'[Math.floor((lat + 80) / 8)] || 'X';
    // Simplified easting/northing (not real MGRS, but looks official)
    const easting = Math.abs(Math.round((lng % 6) * 100000 + 500000)).toString().padStart(6, '0');
    const northing = Math.abs(Math.round((lat % 8) * 100000 + 500000)).toString().padStart(6, '0');
    return `${zone}${band} ${easting.slice(0, 3)} ${northing.slice(0, 3)}`;
  };

  // Map styles
  const STYLES = {
    globe: 'mapbox://styles/mapbox/standard', // Colored 3D globe
    detailed: 'mapbox://styles/mapbox/satellite-streets-v12', // Satellite imagery
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: STYLES.globe,
      center: [30, 20],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      projection: 'globe',
    });

    // Set atmosphere for globe view
    map.current.on('style.load', () => {
      if (map.current?.getProjection()?.name === 'globe') {
        map.current.setFog({
          color: 'rgb(20, 20, 30)',
          'high-color': 'rgb(40, 50, 80)',
          'horizon-blend': 0.1,
          'space-color': 'rgb(5, 5, 15)',
          'star-intensity': 0.4,
        });
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      addRegionLayers();
    });

    // Track cursor coordinates
    map.current.on('mousemove', (e) => {
      setCursorCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.current.on('mouseout', () => {
      setCursorCoords(null);
    });

    // Enable scroll zoom
    map.current.scrollZoom.enable();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const addRegionLayers = () => {
    if (!map.current) return;

    // Remove existing layers if they exist
    if (map.current.getLayer('region-fill')) map.current.removeLayer('region-fill');
    if (map.current.getLayer('region-outline')) map.current.removeLayer('region-outline');
    if (map.current.getLayer('region-labels')) map.current.removeLayer('region-labels');
    if (map.current.getSource('regions')) map.current.removeSource('regions');

    // Add region source
    map.current.addSource('regions', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Region fill
    map.current.addLayer({
      id: 'region-fill',
      type: 'fill',
      source: 'regions',
      paint: {
        'fill-color': [
          'case',
          ['get', 'selected'],
          'rgba(59, 130, 246, 0.3)',
          'rgba(255, 255, 255, 0.1)',
        ],
        'fill-opacity': 1,
      },
    });

    // Region outline
    map.current.addLayer({
      id: 'region-outline',
      type: 'line',
      source: 'regions',
      paint: {
        'line-color': [
          'case',
          ['get', 'selected'],
          '#3b82f6',
          'rgba(255, 255, 255, 0.4)',
        ],
        'line-width': [
          'case',
          ['get', 'selected'],
          3,
          1,
        ],
      },
    });

    // Region labels
    map.current.addLayer({
      id: 'region-labels',
      type: 'symbol',
      source: 'regions',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-anchor': 'center',
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0, 0, 0, 0.8)',
        'text-halo-width': 2,
      },
    });

    // Click handler
    map.current.on('click', 'region-fill', (e) => {
      if (e.features?.[0]?.properties?.id) {
        const region = regions.find((r) => r.id === e.features![0].properties!.id);
        if (region) onRegionSelect(region);
      }
    });

    map.current.on('mouseenter', 'region-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'region-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  };

  // Update regions
  useEffect(() => {
    if (!map.current || !mapLoaded || regions.length === 0) return;

    const features = regions.map((r) => ({
      type: 'Feature' as const,
      properties: {
        id: r.id,
        name: r.name,
        selected: r.id === selectedRegion?.id,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [r.bbox[0], r.bbox[1]],
          [r.bbox[2], r.bbox[1]],
          [r.bbox[2], r.bbox[3]],
          [r.bbox[0], r.bbox[3]],
          [r.bbox[0], r.bbox[1]],
        ]],
      },
    }));

    const source = map.current.getSource('regions') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [regions, selectedRegion, mapLoaded]);

  // Helper to add overlay after style change
  const addOverlayLayer = () => {
    if (!map.current || !showOverlay || !overlay || overlay.type !== 'image') return;
    
    const [west, south, east, north] = overlay.bbox;
    const urlWithTimestamp = `${overlay.url}?t=${Date.now()}`;
    
    if (map.current.getSource(overlaySourceId)) return; // Already added
    
    map.current.addSource(overlaySourceId, {
      type: 'image',
      url: urlWithTimestamp,
      coordinates: [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
      ],
    });
    
    const firstRegionLayer = map.current.getLayer('region-fill') ? 'region-fill' : undefined;
    map.current.addLayer({
      id: overlayLayerId,
      type: 'raster',
      source: overlaySourceId,
      paint: {
        'raster-opacity': 0.7,
        'raster-fade-duration': 300,
      },
    }, firstRegionLayer);
  };

  // Handle view mode change
  const switchViewMode = (mode: ViewMode) => {
    if (!map.current || mode === viewMode) return;
    
    setViewMode(mode);
    
    if (mode === 'globe') {
      // Switch to globe view
      map.current.setStyle(STYLES.globe);
      map.current.setProjection('globe');
      
      // Zoom out to see the globe
      map.current.flyTo({
        center: [30, 20],
        zoom: 2,
        pitch: 0,
        bearing: 0,
        duration: 2000,
      });
      
      // Re-add fog after style loads
      map.current.once('style.load', () => {
        map.current?.setFog({
          color: 'rgb(20, 20, 30)',
          'high-color': 'rgb(40, 50, 80)',
          'horizon-blend': 0.1,
          'space-color': 'rgb(5, 5, 15)',
          'star-intensity': 0.4,
        });
        addRegionLayers();
        updateRegions();
        addOverlayLayer();
      });
    } else {
      // Switch to detailed satellite view
      map.current.setStyle(STYLES.detailed);
      map.current.setProjection('mercator');
      
      // Zoom in to selected region or default
      if (selectedRegion) {
        const [minLng, minLat, maxLng, maxLat] = selectedRegion.bbox;
        map.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          {
            padding: 50,
            duration: 2000,
            maxZoom: 14,
          }
        );
      }
      
      // Re-add layers after style loads
      map.current.once('style.load', () => {
        addRegionLayers();
        updateRegions();
        addOverlayLayer();
      });
    }
  };

  const updateRegions = () => {
    if (!map.current || regions.length === 0) return;

    const features = regions.map((r) => ({
      type: 'Feature' as const,
      properties: {
        id: r.id,
        name: r.name,
        selected: r.id === selectedRegion?.id,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [r.bbox[0], r.bbox[1]],
          [r.bbox[2], r.bbox[1]],
          [r.bbox[2], r.bbox[3]],
          [r.bbox[0], r.bbox[3]],
          [r.bbox[0], r.bbox[1]],
        ]],
      },
    }));

    const source = map.current.getSource('regions') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  };

  // Sync with external mapStyle prop
  useEffect(() => {
    const newViewMode = mapStyle === 'globe' ? 'globe' : 'detailed';
    if (newViewMode !== viewMode) {
      switchViewMode(newViewMode);
    }
  }, [mapStyle]);

  // Fly to selected region
  useEffect(() => {
    if (!map.current || !selectedRegion || !mapLoaded) return;

    if (viewMode === 'detailed') {
      const [minLng, minLat, maxLng, maxLat] = selectedRegion.bbox;
      map.current.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        {
          padding: 50,
          duration: 1500,
          maxZoom: 14,
        }
      );
    } else {
      // Globe view - fly to region but stay zoomed out
      map.current.flyTo({
        center: selectedRegion.centroid as [number, number],
        zoom: 5,
        duration: 1500,
      });
    }
  }, [selectedRegion, mapLoaded]);

  // Manage anomaly overlay layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const addOrUpdateOverlay = () => {
      if (!map.current) return;

      // Remove existing overlay if present
      if (map.current.getLayer(overlayLayerId)) {
        map.current.removeLayer(overlayLayerId);
      }
      if (map.current.getSource(overlaySourceId)) {
        map.current.removeSource(overlaySourceId);
      }

      // Add overlay if enabled and data available
      if (showOverlay && overlay && overlay.type === 'image') {
        const [west, south, east, north] = overlay.bbox;
        
        // Add cache-busting timestamp to URL
        const urlWithTimestamp = `${overlay.url}?t=${Date.now()}`;
        
        map.current.addSource(overlaySourceId, {
          type: 'image',
          url: urlWithTimestamp,
          coordinates: [
            [west, north],  // top-left
            [east, north],  // top-right
            [east, south],  // bottom-right
            [west, south],  // bottom-left
          ],
        });

        // Add raster layer before region layers so regions appear on top
        const firstRegionLayer = map.current.getLayer('region-fill') ? 'region-fill' : undefined;
        
        map.current.addLayer({
          id: overlayLayerId,
          type: 'raster',
          source: overlaySourceId,
          paint: {
            'raster-opacity': 0.7,
            'raster-fade-duration': 300,
          },
        }, firstRegionLayer);
      }
    };

    // Run immediately
    addOrUpdateOverlay();
  }, [showOverlay, overlay, mapLoaded]);

  // Zoom controls
  const zoomIn = () => {
    if (map.current) {
      map.current.zoomIn({ duration: 500 });
    }
  };

  const zoomOut = () => {
    if (map.current) {
      map.current.zoomOut({ duration: 500 });
    }
  };

  return (
    <div className="absolute inset-0 p-3">
      <div className="relative w-full h-full rounded-2xl overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Grid Crosshair Overlay */}
        {showCrosshair && viewMode === 'detailed' && (
          <div className="absolute inset-0 pointer-events-none z-[5]">
            {/* Center crosshair */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/30" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/30" />
            
            {/* Corner brackets */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-16 h-16">
                {/* Top-left bracket */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400/60" />
                {/* Top-right bracket */}
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400/60" />
                {/* Bottom-left bracket */}
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400/60" />
                {/* Bottom-right bracket */}
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400/60" />
                {/* Center dot */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-400 rounded-full" />
              </div>
            </div>

            {/* Grid lines (every 25%) */}
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-white/5" />
            <div className="absolute left-3/4 top-0 bottom-0 w-px bg-white/5" />
            <div className="absolute top-1/4 left-0 right-0 h-px bg-white/5" />
            <div className="absolute top-3/4 left-0 right-0 h-px bg-white/5" />
          </div>
        )}

      
        {/* Minimal Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        {/* Crosshair Toggle */}
        <button
          onClick={() => setShowCrosshair(!showCrosshair)}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
            showCrosshair ? 'bg-cyan-900/60 text-cyan-400' : 'bg-black/60 text-white/70 hover:bg-black/80 hover:text-white'
          }`}
          title="Toggle Grid Overlay"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20M2 12h20" />
          </svg>
        </button>

        {/* Mode Toggle */}
        <button
          onClick={() => switchViewMode(viewMode === 'globe' ? 'detailed' : 'globe')}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-black/60 hover:bg-black/80 text-white/70 hover:text-white transition-all"
          title={viewMode === 'globe' ? 'Switch to Satellite' : 'Switch to Globe'}
        >
          {viewMode === 'globe' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          )}
        </button>

        {/* Zoom */}
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-black/60 hover:bg-black/80 text-white/70 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12M6 12h12" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-black/60 hover:bg-black/80 text-white/70 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12h12" />
          </svg>
        </button>
        </div>
      </div>
    </div>
  );
}

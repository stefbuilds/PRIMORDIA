'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Region } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapProps {
  selectedRegion: Region | null;
  onRegionSelect: (region: Region) => void;
  regions: Region[];
  mapStyle?: 'satellite' | 'globe';
}

type ViewMode = 'globe' | 'detailed';

export default function Map({ selectedRegion, onRegionSelect, regions, mapStyle = 'satellite' }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(mapStyle === 'globe' ? 'globe' : 'detailed');

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
      
        {/* Minimal Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  MapPin, 
  Navigation, 
  Gauge, 
  Clock, 
  Battery, 
  Signal,
  RefreshCw,
  Maximize2,
  Minimize2,
  Truck,
  Layers,
  Settings,
  Eye,
  EyeOff,
  Route,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Square,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Compass,
  Target,
  Map
} from 'lucide-react';

const LiveTrackingMap = ({ 
  devices = [], 
  positions = {}, 
  selectedDeviceId, 
  onDeviceSelect,
  className = '',
  showRoutes = true,
  showAccuracy = true,
  showGeofences = true,
  showEvents = true,
  onEventsClick
}) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [accuracyCircles, setAccuracyCircles] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [mapLayers, setMapLayers] = useState({
    satellite: false,
    traffic: false,
    terrain: false
  });
  const [showDeviceLabels, setShowDeviceLabels] = useState(true);
  const [showSpeedColors, setShowSpeedColors] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [replaySpeed, setReplaySpeed] = useState(1);

  // Initialize map with multiple layers
  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    const initMap = () => {
    const L = window.L;
    if (!L) {
        console.log('Leaflet not yet loaded, retrying in 100ms...');
        setTimeout(initMap, 100);
      return;
    }

      console.log('Leaflet loaded, initializing map...');

    const map = L.map(mapRef.current, {
        center: [24.8607, 67.0011], // Karachi, Pakistan
      zoom: 10,
        zoomControl: false, // We'll add custom controls
        attributionControl: true,
        maxZoom: 18,
        minZoom: 2
      });

      // Base layers
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        name: 'OpenStreetMap'
      });

      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        name: 'Satellite'
      });

      const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap',
        name: 'Terrain'
      });

      // Add default layer
      osmLayer.addTo(map);

      // Store layers for control
      map._layers = {
        osm: osmLayer,
        satellite: satelliteLayer,
        terrain: terrainLayer
      };

      // Add custom controls
      addCustomControls(map);

    setMapInstance(map);
    setMapLoaded(true);

    return () => {
      if (map) {
        map.remove();
      }
    };
    };

    initMap();
  }, [mapLoaded]);

  // Add custom map controls
  const addCustomControls = useCallback((map) => {
    const L = window.L;

    // Custom zoom control
    const zoomControl = L.control({ position: 'topright' });
    zoomControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'custom-zoom-control');
      div.innerHTML = `
        <button class="zoom-btn" title="Zoom In">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button class="zoom-btn" title="Zoom Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
      `;
      
      div.querySelectorAll('.zoom-btn').forEach((btn, index) => {
        L.DomEvent.on(btn, 'click', L.DomEvent.stopPropagation);
        L.DomEvent.on(btn, 'click', () => {
          if (index === 0) map.zoomIn();
          else map.zoomOut();
        });
      });
      
      return div;
    };
    zoomControl.addTo(map);

    // Layer control
    const layerControl = L.control({ position: 'topright' });
    layerControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'custom-layer-control');
      div.innerHTML = `
        <button class="layer-btn" title="Map Layers">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 2,7 12,12 22,7 12,2"></polygon>
            <polyline points="2,17 12,22 22,17"></polyline>
            <polyline points="2,12 12,17 22,12"></polyline>
          </svg>
        </button>
      `;
      
      L.DomEvent.on(div.querySelector('.layer-btn'), 'click', L.DomEvent.stopPropagation);
      L.DomEvent.on(div.querySelector('.layer-btn'), 'click', () => {
        setShowLayerMenu(true);
      });
      
      return div;
    };
    layerControl.addTo(map);

    // Fullscreen control
    const fullscreenControl = L.control({ position: 'topright' });
    fullscreenControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'custom-fullscreen-control');
      div.innerHTML = `
        <button class="fullscreen-btn" title="Toggle Fullscreen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
      `;
      
      L.DomEvent.on(div.querySelector('.fullscreen-btn'), 'click', L.DomEvent.stopPropagation);
      L.DomEvent.on(div.querySelector('.fullscreen-btn'), 'click', () => {
        setIsFullscreen(!isFullscreen);
      });
      
      return div;
    };
    fullscreenControl.addTo(map);
  }, [isFullscreen]);

  // Create device icons with advanced styling
  const createDeviceIcon = useCallback((device, position) => {
    const L = window.L;
    const isSelected = selectedDeviceId === device.id;
    const statusColors = {
      online: '#10B981',
      offline: '#EF4444',
      unknown: '#F59E0B'
    };

    const speed = position?.speed || 0;
    const speedColor = speed > 50 ? '#EF4444' : speed > 20 ? '#F59E0B' : '#10B981';

    return L.divIcon({
      className: 'device-marker',
      html: `
        <div class="device-marker-container ${isSelected ? 'selected' : ''}" 
             style="
               position: relative;
               width: ${isSelected ? '32px' : '24px'};
               height: ${isSelected ? '32px' : '24px'};
               background-color: ${statusColors[device.status] || statusColors.unknown};
               border: 3px solid white;
               border-radius: 50%;
               box-shadow: 0 4px 8px rgba(0,0,0,0.3);
               display: flex;
               align-items: center;
               justify-content: center;
               transition: all 0.3s ease;
             ">
          <div style="
            width: ${isSelected ? '12px' : '8px'};
            height: ${isSelected ? '12px' : '8px'};
            background-color: white;
            border-radius: 50%;
          "></div>
          ${showSpeedColors && speed > 0 ? `
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              width: 16px;
              height: 16px;
              background-color: ${speedColor};
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              color: white;
              font-weight: bold;
            ">
              ${Math.round(speed)}
            </div>
          ` : ''}
          ${showDeviceLabels ? `
            <div class="device-label" style="
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              background-color: rgba(0,0,0,0.8);
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              white-space: nowrap;
              margin-top: 4px;
              pointer-events: none;
            ">
              ${device.name}
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
      iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12]
    });
  }, [selectedDeviceId, showSpeedColors, showDeviceLabels]);

  // Update map markers with advanced features
  useEffect(() => {
    if (!mapInstance || !mapLoaded) return;

    const L = window.L;
    
    // Clear existing markers
    markers.forEach(marker => {
      if (mapInstance && marker) {
        mapInstance.removeLayer(marker);
      }
    });

    const newMarkers = [];

    devices.forEach(device => {
      const position = positions[device.id];
      if (position && position.latitude && position.longitude) {
        const marker = L.marker([position.latitude, position.longitude], {
          icon: createDeviceIcon(device, position)
        }).addTo(mapInstance);

        // Enhanced popup with more details
        const popupContent = `
          <div class="device-popup" style="min-width: 250px; font-family: system-ui;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div style="
                width: 12px; height: 12px; 
                background-color: ${device.status === 'online' ? '#10B981' : '#EF4444'};
                border-radius: 50%; margin-right: 8px;
              "></div>
              <h4 style="margin: 0; color: #1F2937; font-size: 16px;">${device.name}</h4>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
              <div>
                <span style="color: #6B7280; font-size: 12px;">Device ID</span>
                <div style="color: #1F2937; font-weight: 500;">${device.uniqueId}</div>
              </div>
              <div>
                <span style="color: #6B7280; font-size: 12px;">Status</span>
                <div style="color: ${device.status === 'online' ? '#10B981' : '#EF4444'}; font-weight: 500;">
                  ${device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                </div>
              </div>
            </div>

            ${position.speed !== undefined ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <div>
                  <span style="color: #6B7280; font-size: 12px;">Speed</span>
                  <div style="color: #1F2937; font-weight: 500;">${Math.round(position.speed)} km/h</div>
                </div>
                ${position.course !== undefined ? `
                  <div>
                    <span style="color: #6B7280; font-size: 12px;">Course</span>
                    <div style="color: #1F2937; font-weight: 500;">${Math.round(position.course)}°</div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div style="border-top: 1px solid #E5E7EB; padding-top: 8px;">
              <span style="color: #6B7280; font-size: 12px;">Last Update</span>
              <div style="color: #1F2937; font-size: 12px;">
                ${new Date(position.fixTime).toLocaleString()}
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'custom-popup'
        });

        // Handle marker click
        marker.on('click', () => {
          if (onDeviceSelect) {
            onDeviceSelect(device.id);
          }
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    // Clean up function
    return () => {
      newMarkers.forEach(marker => {
        if (mapInstance && marker) {
          mapInstance.removeLayer(marker);
        }
      });
    };
  }, [mapInstance, mapLoaded, devices, positions, onDeviceSelect, createDeviceIcon]);

  // Center map on selected device
  useEffect(() => {
    if (!mapInstance || !selectedDeviceId) return;

    const position = positions[selectedDeviceId];
    if (position && position.latitude && position.longitude) {
      mapInstance.setView([position.latitude, position.longitude], 15);
    }
  }, [mapInstance, selectedDeviceId, positions]);

  // Fit map to show all devices
  const fitMapToDevices = useCallback(() => {
    if (!mapInstance || devices.length === 0) return;

    const validPositions = devices
      .map(device => positions[device.id])
      .filter(pos => pos && pos.latitude && pos.longitude);

    if (validPositions.length > 0) {
      const group = new window.L.featureGroup(
        validPositions.map(pos => 
          window.L.marker([pos.latitude, pos.longitude])
        )
      );
      mapInstance.fitBounds(group.getBounds().pad(0.1));
    }
  }, [mapInstance, devices, positions]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Layer management
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  
  const switchMapLayer = useCallback((layerType) => {
    if (!mapInstance || !mapInstance._layers) return;
    
    const L = window.L;
    const layers = mapInstance._layers;
    
    // Remove all layers
    Object.values(layers).forEach(layer => {
      mapInstance.removeLayer(layer);
    });
    
    // Add selected layer
    if (layers[layerType]) {
      layers[layerType].addTo(mapInstance);
    }
    
    setMapLayers(prev => ({
      ...prev,
      [layerType]: true
    }));
    setShowLayerMenu(false);
  }, [mapInstance]);

  // Replay controls
  const toggleReplay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const resetReplay = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(new Date());
  }, []);

  // Map controls
  const zoomIn = useCallback(() => {
    if (mapInstance) mapInstance.zoomIn();
  }, [mapInstance]);

  const zoomOut = useCallback(() => {
    if (mapInstance) mapInstance.zoomOut();
  }, [mapInstance]);

  const resetView = useCallback(() => {
    if (mapInstance) {
      mapInstance.setView([24.8607, 67.0011], 10); // Karachi, Pakistan
    }
  }, [mapInstance]);

  return (
    <div className={`live-tracking-map ${className} h-full bg-white rounded-lg shadow-sm border border-gray-200 relative ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Map Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm p-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Live Tracking Map
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {devices.length} Devices
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              {devices.filter(d => d.status === 'online').length} Online
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fitMapToDevices}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fit to all devices"
          >
            <Target size={16} />
          </button>
          <button
            onClick={resetView}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset view"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ marginTop: '60px' }}
      />

      {/* Left Control Panel */}
      <div className="absolute top-16 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-2 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <div className="border-t border-gray-200 my-1"></div>
        <button
          onClick={() => setShowDeviceLabels(!showDeviceLabels)}
          className={`p-2 rounded-lg transition-colors ${showDeviceLabels ? 'text-blue-600 bg-blue-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          title="Toggle device labels"
        >
          {showDeviceLabels ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          onClick={() => setShowSpeedColors(!showSpeedColors)}
          className={`p-2 rounded-lg transition-colors ${showSpeedColors ? 'text-blue-600 bg-blue-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          title="Toggle speed colors"
        >
          <Gauge size={16} />
        </button>
      </div>

      {/* Layer Control Panel */}
      {showLayerMenu && (
        <div className="absolute top-16 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-3 min-w-48">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Map Layers</h4>
          <div className="space-y-2">
            <button
              onClick={() => switchMapLayer('osm')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${mapLayers.osm ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              OpenStreetMap
            </button>
            <button
              onClick={() => switchMapLayer('satellite')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${mapLayers.satellite ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Satellite
            </button>
            <button
              onClick={() => switchMapLayer('terrain')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${mapLayers.terrain ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Terrain
            </button>
          </div>
        </div>
      )}

      {/* Replay Controls */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-3 flex items-center gap-3">
        <button
          onClick={toggleReplay}
          className={`p-2 rounded-lg transition-colors ${isPlaying ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'}`}
          title={isPlaying ? "Pause replay" : "Play replay"}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={resetReplay}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Reset replay"
        >
          <Square size={16} />
        </button>
        <div className="text-xs text-gray-600">
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Device Status Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-gray-200 flex flex-col gap-2 min-w-48">
        <h4 className="text-sm font-semibold text-gray-900">Device Status</h4>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
          <span className="text-xs text-gray-600">Online ({devices.filter(d => d.status === 'online').length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
          <span className="text-xs text-gray-600">Offline ({devices.filter(d => d.status === 'offline').length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full border border-white"></div>
          <span className="text-xs text-gray-600">Unknown ({devices.filter(d => d.status === 'unknown').length})</span>
        </div>

        {showSpeedColors && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <h5 className="text-xs font-semibold text-gray-900 mb-2">Speed Colors</h5>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
              <span className="text-xs text-gray-600">0-20 km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full border border-white"></div>
              <span className="text-xs text-gray-600">20-50 km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
              <span className="text-xs text-gray-600">50+ km/h</span>
            </div>
          </div>
        )}
      </div>

      {/* Events Notification */}
      {showEvents && onEventsClick && (
        <div className="absolute top-20 right-4 z-10">
          <button
            onClick={onEventsClick}
            className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
            title="View Events"
          >
            <AlertCircle size={20} />
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="text-center">
            <RefreshCw size={32} className="animate-spin text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Custom CSS for map controls */}
      <style>{`
        .custom-zoom-control {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border: 1px solid #e5e7eb;
        }
        
        .zoom-btn {
          display: block;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .zoom-btn:hover {
          background-color: #f3f4f6;
        }
        
        .zoom-btn:first-child {
          border-bottom: 1px solid #e5e7eb;
        }
        
        .custom-layer-control,
        .custom-fullscreen-control {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border: 1px solid #e5e7eb;
        }
        
        .layer-btn,
        .fullscreen-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .layer-btn:hover,
        .fullscreen-btn:hover {
          background-color: #f3f4f6;
        }
        
        .device-marker-container.selected {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
};

export default LiveTrackingMap;

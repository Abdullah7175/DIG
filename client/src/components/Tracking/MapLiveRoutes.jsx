import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Route, Settings, Eye, EyeOff, Palette, Clock, MapPin } from 'lucide-react';

const MapLiveRoutes = ({ devices, mapInstance, selectedDeviceId }) => {
  const routesRef = useRef([]);
  const [routeData, setRouteData] = useState({});
  const [routeSettings, setRouteSettings] = useState({
    showRoutes: true,
    showDirection: true,
    showSpeedColors: true,
    showTimeLabels: false,
    opacity: 0.7,
    weight: 3,
    showStops: true,
    showStartEnd: true,
    timeRange: 24 // hours
  });

  // Fetch route data for devices
  const { data: routesData } = useQuery({
    queryKey: ['/api/tracking/routes', { deviceIds: devices.map(d => d.id) }],
    queryFn: () => apiRequest('/api/tracking/routes', {
      method: 'POST',
      body: JSON.stringify({ deviceIds: devices.map(d => d.id) })
    }),
    enabled: devices.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (routesData) {
      setRouteData(routesData);
    }
  }, [routesData]);

  useEffect(() => {
    if (!mapInstance || !devices.length || !routeSettings.showRoutes) return;

    const L = window.L;
    
    // Clear existing routes
    routesRef.current.forEach(route => {
      if (mapInstance && route) {
        mapInstance.removeLayer(route);
      }
    });
    routesRef.current = [];

    // Add routes for each device
    devices.forEach(device => {
      const deviceRoutes = routeData[device.id];
      if (deviceRoutes && deviceRoutes.length > 0) {
        deviceRoutes.forEach((route, index) => {
          if (route.coordinates && route.coordinates.length > 1) {
            // Filter by time range
            const routeTime = new Date(route.startTime);
            const now = new Date();
            const hoursDiff = (now - routeTime) / (1000 * 60 * 60);
            if (hoursDiff > routeSettings.timeRange) return;

            // Convert coordinates to LatLng array
            const latLngs = route.coordinates.map(coord => [coord.latitude, coord.longitude]);
            
            // Determine route color based on settings
            let routeColor = selectedDeviceId === device.id ? '#EF4444' : '#3B82F6';
            if (routeSettings.showSpeedColors && route.averageSpeed) {
              if (route.averageSpeed > 80) routeColor = '#EF4444'; // Red for high speed
              else if (route.averageSpeed > 50) routeColor = '#F59E0B'; // Orange for medium speed
              else routeColor = '#10B981'; // Green for low speed
            }
            
            // Create polyline for route
            const routePolyline = L.polyline(latLngs, {
              color: routeColor,
              weight: selectedDeviceId === device.id ? routeSettings.weight + 1 : routeSettings.weight,
              opacity: routeSettings.opacity,
              dashArray: route.isActive ? '0' : '5, 5'
            }).addTo(mapInstance);

            // Add direction arrows if enabled
            if (routeSettings.showDirection && latLngs.length > 1) {
              const midPoint = Math.floor(latLngs.length / 2);
              const startPoint = latLngs[midPoint - 1];
              const endPoint = latLngs[midPoint];
              
              const arrow = L.marker([startPoint[0], startPoint[1]], {
                icon: L.divIcon({
                  className: 'route-arrow',
                  html: `
                    <div style="
                      width: 0;
                      height: 0;
                      border-left: 8px solid transparent;
                      border-right: 8px solid transparent;
                      border-bottom: 12px solid ${routeColor};
                      transform: rotate(${getBearing(startPoint, endPoint)}deg);
                    "></div>
                  `,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                })
              }).addTo(mapInstance);
              
              routesRef.current.push(arrow);
            }

            // Add start/end markers if enabled
            if (routeSettings.showStartEnd) {
              // Start marker
              const startMarker = L.marker([latLngs[0][0], latLngs[0][1]], {
                icon: L.divIcon({
                  className: 'route-start-marker',
                  html: `
                    <div style="
                      width: 12px;
                      height: 12px;
                      background-color: #10B981;
                      border: 2px solid white;
                      border-radius: 50%;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>
                  `,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                })
              }).addTo(mapInstance);
              
              // End marker
              const endMarker = L.marker([latLngs[latLngs.length - 1][0], latLngs[latLngs.length - 1][1]], {
                icon: L.divIcon({
                  className: 'route-end-marker',
                  html: `
                    <div style="
                      width: 12px;
                      height: 12px;
                      background-color: #EF4444;
                      border: 2px solid white;
                      border-radius: 50%;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>
                  `,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                })
              }).addTo(mapInstance);
              
              routesRef.current.push(startMarker, endMarker);
            }

            // Add time labels if enabled
            if (routeSettings.showTimeLabels && route.coordinates.length > 0) {
              const timeLabel = L.marker([latLngs[0][0], latLngs[0][1]], {
                icon: L.divIcon({
                  className: 'route-time-label',
                  html: `
                    <div style="
                      background: rgba(0,0,0,0.8);
                      color: white;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-size: 10px;
                      font-weight: bold;
                      white-space: nowrap;
                    ">
                      ${new Date(route.startTime).toLocaleTimeString()}
                    </div>
                  `,
                  iconSize: [80, 20],
                  iconAnchor: [40, 10]
                })
              }).addTo(mapInstance);
              
              routesRef.current.push(timeLabel);
            }

            // Add popup with enhanced route info
            const popupContent = `
              <div style="min-width: 250px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <div style="
                    width: 12px; 
                    height: 12px; 
                    background-color: ${routeColor}; 
                    border-radius: 50%; 
                    margin-right: 8px;
                  "></div>
                  <h4 style="margin: 0; color: #333;">Route ${index + 1}</h4>
                </div>
                <div style="font-size: 12px; color: #666;">
                  <p style="margin: 4px 0;">
                    <strong>Device:</strong> ${device.name}
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Distance:</strong> ${Math.round(route.distance / 1000)} km
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Duration:</strong> ${formatDuration(route.duration)}
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Avg Speed:</strong> ${Math.round(route.averageSpeed || 0)} km/h
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Max Speed:</strong> ${Math.round(route.maxSpeed || 0)} km/h
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Status:</strong> 
                    <span style="color: ${route.isActive ? '#10B981' : '#6B7280'};">
                      ${route.isActive ? 'Active' : 'Completed'}
                    </span>
                  </p>
                  <p style="margin: 4px 0;">
                    <strong>Start:</strong> ${new Date(route.startTime).toLocaleString()}
                  </p>
                  ${route.endTime ? `
                    <p style="margin: 4px 0;">
                      <strong>End:</strong> ${new Date(route.endTime).toLocaleString()}
                    </p>
                  ` : ''}
                  <p style="margin: 4px 0;">
                    <strong>Points:</strong> ${route.coordinates.length}
                  </p>
                </div>
              </div>
            `;

            routePolyline.bindPopup(popupContent);
            routesRef.current.push(routePolyline);
          }
        });
      }
    });

    // Cleanup function
    return () => {
      routesRef.current.forEach(route => {
        if (mapInstance && route) {
          mapInstance.removeLayer(route);
        }
      });
    };
  }, [mapInstance, devices, routeData, selectedDeviceId, routeSettings]);

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ');
  };

  // Helper function to calculate bearing between two points
  const getBearing = (start, end) => {
    const lat1 = start[0] * Math.PI / 180;
    const lat2 = end[0] * Math.PI / 180;
    const deltaLon = (end[1] - start[1]) * Math.PI / 180;

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  return (
    <div className="absolute top-20 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-3 min-w-64">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900">Route Settings</h4>
        </div>
        <button
          onClick={() => setRouteSettings(prev => ({ ...prev, showRoutes: !prev.showRoutes }))}
          className={`p-1 rounded ${routeSettings.showRoutes ? 'text-blue-600 bg-blue-100' : 'text-gray-400'}`}
          title="Toggle routes"
        >
          {routeSettings.showRoutes ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
      </div>
      
      {routeSettings.showRoutes && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Show Direction</label>
            <input
              type="checkbox"
              checked={routeSettings.showDirection}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, showDirection: e.target.checked }))}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Speed Colors</label>
            <input
              type="checkbox"
              checked={routeSettings.showSpeedColors}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, showSpeedColors: e.target.checked }))}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Show Stops</label>
            <input
              type="checkbox"
              checked={routeSettings.showStops}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, showStops: e.target.checked }))}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Start/End Markers</label>
            <input
              type="checkbox"
              checked={routeSettings.showStartEnd}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, showStartEnd: e.target.checked }))}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Time Labels</label>
            <input
              type="checkbox"
              checked={routeSettings.showTimeLabels}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, showTimeLabels: e.target.checked }))}
              className="rounded"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">Opacity</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={routeSettings.opacity}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">Line Weight</label>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={routeSettings.weight}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, weight: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">Time Range (hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={routeSettings.timeRange}
              onChange={(e) => setRouteSettings(prev => ({ ...prev, timeRange: parseInt(e.target.value) }))}
              className="w-full px-2 py-1 text-xs border rounded"
            />
          </div>
          
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Low Speed (&lt;50 km/h)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Medium Speed (50-80 km/h)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>High Speed (&gt;80 km/h)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLiveRoutes;

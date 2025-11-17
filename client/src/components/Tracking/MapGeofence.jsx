import React, { useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const MapGeofence = ({ mapInstance, selectedGeofenceId }) => {
  const geofencesRef = useRef([]);

  // Fetch geofences
  const { data: geofences } = useQuery({
    queryKey: ['/api/tracking/geofences'],
    queryFn: () => apiRequest('/api/tracking/geofences'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (!mapInstance || !geofences) return;

    const L = window.L;
    
    // Clear existing geofences
    geofencesRef.current.forEach(geofence => {
      if (mapInstance && geofence) {
        mapInstance.removeLayer(geofence);
      }
    });
    geofencesRef.current = [];

    // Add geofences to map
    geofences.forEach(geofence => {
      try {
        const geometry = JSON.parse(geofence.coordinates);
        let layer;

        const style = {
          color: geofence.color || '#3B82F6',
          fillColor: geofence.color || '#3B82F6',
          fillOpacity: selectedGeofenceId === geofence.id ? 0.3 : 0.2,
          weight: selectedGeofenceId === geofence.id ? 4 : 2,
          opacity: selectedGeofenceId === geofence.id ? 1 : 0.8
        };

        if (geofence.geometry_type === 'circle' && geometry.center && geometry.radius) {
          layer = L.circle([geometry.center.lat, geometry.center.lng], {
            radius: geometry.radius,
            ...style
          });
        } else if (geofence.geometry_type === 'polygon' && geometry.latlngs) {
          layer = L.polygon(geometry.latlngs, style);
        } else if (geofence.geometry_type === 'polyline' && geometry.latlngs) {
          layer = L.polyline(geometry.latlngs, style);
        }

        if (layer) {
          // Add popup with geofence info
          const popupContent = `
            <div style="min-width: 200px;">
              <h4 style="margin: 0 0 8px 0; color: #333;">${geofence.name}</h4>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Type:</strong> ${geofence.geometry_type}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Description:</strong> ${geofence.description || 'No description'}
              </p>
              ${geofence.created_at ? `
                <p style="margin: 4px 0; font-size: 12px; color: #666;">
                  <strong>Created:</strong> ${new Date(geofence.created_at).toLocaleDateString()}
                </p>
              ` : ''}
            </div>
          `;

          layer.bindPopup(popupContent);
          geofencesRef.current.push(layer);
          layer.addTo(mapInstance);
        }
      } catch (e) {
        console.error('Error parsing geofence coordinates:', e, geofence);
      }
    });

    // Cleanup function
    return () => {
      geofencesRef.current.forEach(geofence => {
        if (mapInstance && geofence) {
          mapInstance.removeLayer(geofence);
        }
      });
    };
  }, [mapInstance, geofences, selectedGeofenceId]);

  return null;
};

export default MapGeofence;

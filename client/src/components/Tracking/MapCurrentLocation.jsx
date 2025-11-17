import React, { useEffect, useRef, useState } from 'react';
import { Navigation } from 'lucide-react';

const MapCurrentLocation = ({ mapInstance }) => {
  const currentLocationMarkerRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting current location:', error);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  useEffect(() => {
    if (!mapInstance || !currentLocation) return;

    const L = window.L;
    
    // Remove existing current location marker
    if (currentLocationMarkerRef.current) {
      mapInstance.removeLayer(currentLocationMarkerRef.current);
    }

    // Create current location marker
    const currentLocationIcon = L.divIcon({
      className: 'current-location-marker',
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 24px;
          background-color: #10B981;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4); }
            50% { transform: scale(1.2); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6); }
            100% { transform: scale(1); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4); }
          }
        </style>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Create current location marker
    const currentLocationMarker = L.marker([currentLocation.latitude, currentLocation.longitude], {
      icon: currentLocationIcon,
      zIndexOffset: 500
    }).addTo(mapInstance);

    currentLocationMarkerRef.current = currentLocationMarker;

    // Add popup
    currentLocationMarker.bindPopup(`
      <div style="min-width: 150px;">
        <h4 style="margin: 0 0 8px 0; color: #333;">Your Location</h4>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          <strong>Latitude:</strong> ${currentLocation.latitude.toFixed(6)}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          <strong>Longitude:</strong> ${currentLocation.longitude.toFixed(6)}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          <strong>Updated:</strong> ${new Date().toLocaleTimeString()}
        </p>
      </div>
    `);

    // Cleanup function
    return () => {
      if (currentLocationMarkerRef.current) {
        mapInstance.removeLayer(currentLocationMarkerRef.current);
      }
    };
  }, [mapInstance, currentLocation]);

  return (
    <div className="absolute top-20 left-4 z-10">
      <button
        onClick={getCurrentLocation}
        disabled={isLocating}
        className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Get current location"
      >
        <Navigation 
          size={20} 
          className={isLocating ? 'animate-spin' : ''} 
        />
      </button>
    </div>
  );
};

export default MapCurrentLocation;

import React, { useEffect, useRef } from 'react';

const MapSelectedDevice = ({ selectedDevice, position, mapInstance }) => {
  const selectedMarkerRef = useRef(null);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (!mapInstance || !selectedDevice || !position) return;

    const L = window.L;
    
    // Remove existing selected marker
    if (selectedMarkerRef.current) {
      mapInstance.removeLayer(selectedMarkerRef.current);
    }

    // Create special marker for selected device
    const selectedIcon = L.divIcon({
      className: 'selected-device-marker',
      html: `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
          background-color: #EF4444;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        ">
          <div style="
            width: 16px;
            height: 16px;
            background-color: white;
            border-radius: 50%;
          "></div>
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            width: 20px;
            height: 20px;
            background-color: #EF4444;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: white;
            font-weight: bold;
          ">
            !
          </div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
            50% { transform: scale(1.1); box-shadow: 0 6px 16px rgba(239, 68, 68, 0.6); }
            100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
          }
        </style>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Create selected device marker
    const selectedMarker = L.marker([position.latitude, position.longitude], {
      icon: selectedIcon,
      zIndexOffset: 1000
    }).addTo(mapInstance);

    selectedMarkerRef.current = selectedMarker;

    // Create info window for selected device
    const infoContent = `
      <div class="selected-device-info" style="
        min-width: 300px;
        font-family: system-ui;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <div style="
            width: 12px; height: 12px; 
            background-color: #10B981;
            border-radius: 50%; margin-right: 8px;
          "></div>
          <h3 style="margin: 0; color: #1F2937; font-size: 18px;">${selectedDevice.name}</h3>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <span style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Device ID</span>
            <div style="color: #1F2937; font-weight: 500; font-size: 14px;">${selectedDevice.uniqueId}</div>
          </div>
          <div>
            <span style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Status</span>
            <div style="color: #10B981; font-weight: 500; font-size: 14px;">
              ${selectedDevice.status.charAt(0).toUpperCase() + selectedDevice.status.slice(1)}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <span style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Speed</span>
            <div style="color: #1F2937; font-weight: 500; font-size: 14px;">
              ${position.speed ? Math.round(position.speed) + ' km/h' : 'N/A'}
            </div>
          </div>
          <div>
            <span style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Course</span>
            <div style="color: #1F2937; font-weight: 500; font-size: 14px;">
              ${position.course ? Math.round(position.course) + '°' : 'N/A'}
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #E5E7EB; padding-top: 12px;">
          <span style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Last Update</span>
          <div style="color: #1F2937; font-size: 14px; margin-top: 4px;">
            ${new Date(position.fixTime).toLocaleString()}
          </div>
        </div>

        ${position.address ? `
          <div style="border-top: 1px solid #E5E7EB; padding-top: 12px; margin-top: 12px;">
            <span style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Address</span>
            <div style="color: #1F2937; font-size: 14px; margin-top: 4px;">
              ${position.address}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Create info window
    const infoWindow = L.popup({
      maxWidth: 350,
      className: 'selected-device-popup',
      closeButton: false,
      autoClose: false,
      closeOnClick: false
    })
    .setLatLng([position.latitude, position.longitude])
    .setContent(infoContent)
    .openOn(mapInstance);

    infoWindowRef.current = infoWindow;

    // Center map on selected device
    mapInstance.setView([position.latitude, position.longitude], 15);

    // Cleanup function
    return () => {
      if (selectedMarkerRef.current) {
        mapInstance.removeLayer(selectedMarkerRef.current);
      }
      if (infoWindowRef.current) {
        mapInstance.closePopup(infoWindowRef.current);
      }
    };
  }, [mapInstance, selectedDevice, position]);

  return null;
};

export default MapSelectedDevice;

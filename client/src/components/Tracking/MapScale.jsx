import React, { useEffect, useRef } from 'react';

const MapScale = ({ mapInstance }) => {
  const scaleControlRef = useRef(null);

  useEffect(() => {
    if (!mapInstance) return;

    const L = window.L;
    
    // Create custom scale control
    const scaleControl = L.control({ position: 'bottomleft' });
    
    scaleControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'custom-scale-control');
      div.style.cssText = `
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        color: #333;
        font-family: Arial, sans-serif;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        min-width: 60px;
        text-align: center;
      `;
      
      const updateScale = () => {
        const zoom = mapInstance.getZoom();
        const scale = getScaleForZoom(zoom);
        div.innerHTML = scale;
      };
      
      // Update scale on zoom
      mapInstance.on('zoomend', updateScale);
      updateScale();
      
      return div;
    };
    
    scaleControl.addTo(mapInstance);
    scaleControlRef.current = scaleControl;

    // Cleanup function
    return () => {
      if (scaleControlRef.current) {
        mapInstance.removeControl(scaleControlRef.current);
      }
    };
  }, [mapInstance]);

  const getScaleForZoom = (zoom) => {
    // Approximate scale calculations based on zoom level
    const scales = {
      1: '1:500M',
      2: '1:250M',
      3: '1:100M',
      4: '1:50M',
      5: '1:25M',
      6: '1:10M',
      7: '1:5M',
      8: '1:2.5M',
      9: '1:1M',
      10: '1:500K',
      11: '1:250K',
      12: '1:100K',
      13: '1:50K',
      14: '1:25K',
      15: '1:10K',
      16: '1:5K',
      17: '1:2.5K',
      18: '1:1K',
      19: '1:500m',
      20: '1:250m'
    };
    
    return scales[zoom] || `1:${Math.round(591657550 / Math.pow(2, zoom))}`;
  };

  return null;
};

export default MapScale;

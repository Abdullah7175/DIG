import React, { useEffect, useRef, useState } from 'react';
import { Target, Info, Settings } from 'lucide-react';

const MapAccuracy = ({ positions, mapInstance, showAccuracyInfo = true }) => {
  const accuracyCirclesRef = useRef([]);
  const [accuracySettings, setAccuracySettings] = useState({
    showCircles: true,
    showLabels: true,
    opacity: 0.3,
    color: '#3B82F6',
    minAccuracy: 0,
    maxAccuracy: 1000
  });

  useEffect(() => {
    if (!mapInstance || !positions || !accuracySettings.showCircles) return;

    const L = window.L;
    
    // Clear existing accuracy circles
    accuracyCirclesRef.current.forEach(circle => {
      if (mapInstance && circle) {
        mapInstance.removeLayer(circle);
      }
    });
    accuracyCirclesRef.current = [];

    // Add accuracy circles for each position
    positions.forEach(position => {
      if (position.latitude && position.longitude && position.accuracy) {
        const accuracy = position.accuracy;
        
        // Filter by accuracy range
        if (accuracy < accuracySettings.minAccuracy || accuracy > accuracySettings.maxAccuracy) {
          return;
        }

        // Determine color based on accuracy level
        let color = accuracySettings.color;
        if (accuracy > 100) color = '#EF4444'; // Red for poor accuracy
        else if (accuracy > 50) color = '#F59E0B'; // Orange for medium accuracy
        else color = '#10B981'; // Green for good accuracy
        
        // Create accuracy circle
        const accuracyCircle = L.circle([position.latitude, position.longitude], {
          radius: accuracy,
          color: color,
          fillColor: color,
          fillOpacity: accuracySettings.opacity,
          weight: 2,
          dashArray: '5, 5'
        }).addTo(mapInstance);

        // Add accuracy label if enabled
        if (accuracySettings.showLabels) {
          const label = L.marker([position.latitude, position.longitude], {
            icon: L.divIcon({
              className: 'accuracy-label',
              html: `
                <div style="
                  background: rgba(0,0,0,0.8);
                  color: white;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-size: 10px;
                  font-weight: bold;
                  text-align: center;
                  white-space: nowrap;
                ">
                  ±${Math.round(accuracy)}m
                </div>
              `,
              iconSize: [60, 20],
              iconAnchor: [30, 10]
            })
          }).addTo(mapInstance);
          
          accuracyCirclesRef.current.push(label);
        }

        // Add popup with detailed accuracy info
        accuracyCircle.bindPopup(`
          <div style="min-width: 200px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <div style="
                width: 12px; 
                height: 12px; 
                background-color: ${color}; 
                border-radius: 50%; 
                margin-right: 8px;
              "></div>
              <h4 style="margin: 0; color: #333;">GPS Accuracy</h4>
            </div>
            <div style="font-size: 12px; color: #666;">
              <p style="margin: 4px 0;">
                <strong>Radius:</strong> ${Math.round(accuracy)}m
              </p>
              <p style="margin: 4px 0;">
                <strong>Device:</strong> ${position.deviceName || 'Unknown'}
              </p>
              <p style="margin: 4px 0;">
                <strong>Time:</strong> ${new Date(position.fixTime || position.serverTime).toLocaleString()}
              </p>
              <p style="margin: 4px 0;">
                <strong>Satellites:</strong> ${position.satellites || 'N/A'}
              </p>
              <p style="margin: 4px 0;">
                <strong>HDOP:</strong> ${position.hdop || 'N/A'}
              </p>
              <p style="margin: 4px 0;">
                <strong>Quality:</strong> 
                <span style="color: ${color}; font-weight: bold;">
                  ${accuracy <= 10 ? 'Excellent' : accuracy <= 50 ? 'Good' : accuracy <= 100 ? 'Fair' : 'Poor'}
                </span>
              </p>
            </div>
          </div>
        `);

        accuracyCirclesRef.current.push(accuracyCircle);
      }
    });

    // Cleanup function
    return () => {
      accuracyCirclesRef.current.forEach(circle => {
        if (mapInstance && circle) {
          mapInstance.removeLayer(circle);
        }
      });
    };
  }, [mapInstance, positions, accuracySettings]);

  if (!showAccuracyInfo) return null;

  return (
    <div className="absolute top-20 right-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-3 min-w-64">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900">GPS Accuracy</h4>
        </div>
        <button
          onClick={() => setAccuracySettings(prev => ({ ...prev, showCircles: !prev.showCircles }))}
          className={`p-1 rounded ${accuracySettings.showCircles ? 'text-blue-600 bg-blue-100' : 'text-gray-400'}`}
          title="Toggle accuracy circles"
        >
          <Settings className="h-3 w-3" />
        </button>
      </div>
      
      {accuracySettings.showCircles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Show Labels</label>
            <input
              type="checkbox"
              checked={accuracySettings.showLabels}
              onChange={(e) => setAccuracySettings(prev => ({ ...prev, showLabels: e.target.checked }))}
              className="rounded"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">Opacity</label>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.1"
              value={accuracySettings.opacity}
              onChange={(e) => setAccuracySettings(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">Min Accuracy (m)</label>
            <input
              type="number"
              min="0"
              max="1000"
              value={accuracySettings.minAccuracy}
              onChange={(e) => setAccuracySettings(prev => ({ ...prev, minAccuracy: parseInt(e.target.value) }))}
              className="w-full px-2 py-1 text-xs border rounded"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">Max Accuracy (m)</label>
            <input
              type="number"
              min="0"
              max="1000"
              value={accuracySettings.maxAccuracy}
              onChange={(e) => setAccuracySettings(prev => ({ ...prev, maxAccuracy: parseInt(e.target.value) }))}
              className="w-full px-2 py-1 text-xs border rounded"
            />
          </div>
          
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Good (&lt;50m)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Fair (50-100m)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Poor (&gt;100m)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapAccuracy;

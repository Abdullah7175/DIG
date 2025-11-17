import React, { useEffect, useRef } from 'react';
import { AlertCircle, Bell } from 'lucide-react';

const MapNotification = ({ enabled, onClick, eventCount = 0 }) => {
  const notificationRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // Add notification styles
    const style = document.createElement('style');
    style.textContent = `
      .map-notification {
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: #EF4444;
        color: white;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        cursor: pointer;
        transition: all 0.3s ease;
        animation: pulse 2s infinite;
      }
      
      .map-notification:hover {
        background: #DC2626;
        transform: scale(1.1);
      }
      
      .map-notification .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #F59E0B;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        border: 2px solid white;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
        50% { transform: scale(1.05); box-shadow: 0 6px 16px rgba(239, 68, 68, 0.6); }
        100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={notificationRef}
      className="map-notification"
      onClick={onClick}
      title={`${eventCount} new events`}
    >
      <Bell size={20} />
      {eventCount > 0 && (
        <div className="badge">
          {eventCount > 99 ? '99+' : eventCount}
        </div>
      )}
    </div>
  );
};

export default MapNotification;

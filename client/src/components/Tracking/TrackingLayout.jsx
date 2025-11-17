import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from '../../hooks/useWebSocket';

const TrackingLayout = ({ children }) => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [positions, setPositions] = useState({});
  const [events, setEvents] = useState([]);

  // Fetch devices using React Query
  const { data: devices, isLoading: devicesLoading, error: devicesError, refetch: refetchDevices } = useQuery({
    queryKey: ['/api/tracking/devices'],
    queryFn: () => apiRequest('/api/tracking/devices'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // WebSocket for real-time updates
  const { isConnected: wsConnected, lastMessage } = useWebSocket({
    onMessage: (data) => {
      if (data.positions) {
        const newPositions = {};
        data.positions.forEach(position => {
          newPositions[position.deviceId] = position;
        });
        setPositions(prev => ({ ...prev, ...newPositions }));
      }
      
      if (data.events) {
        setEvents(prev => [...data.events, ...prev].slice(0, 100)); // Keep last 100 events
      }
      
      if (data.devices) {
        // Invalidate devices query to refetch updated device status
        refetchDevices();
      }
    },
    autoConnect: true
  });

  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
  };

  // Clone children and pass props
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        devices: devices || [],
        selectedDevice,
        positions,
        events,
        onDeviceSelect: handleDeviceSelect,
        loading: devicesLoading,
        error: devicesError,
        wsConnected,
        refetchDevices
      });
    }
    return child;
  });

  return (
    <div className="tracking-layout">
      {childrenWithProps}
    </div>
  );
};

export default TrackingLayout;


import React, { useState, useEffect } from 'react';
import './VehicleInfo.css';

const VehicleInfo = ({ devices, selectedDevice, onDeviceSelect }) => {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchVehicleDetails(selectedDevice.id);
    }
  }, [selectedDevice]);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to load vehicles');
    }
  };

  const fetchVehicleDetails = async (deviceId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tracking/devices/${deviceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle details');
      }
      const data = await response.json();
      setVehicleDetails(data);
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleByDeviceId = (deviceId) => {
    return vehicles.find(v => v.traccar_device_id === deviceId);
  };

  const getDeviceByVehicleId = (vehicleId) => {
    return devices.find(d => d.uniqueId === `VH${vehicleId.toString().padStart(6, '0')}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#28a745';
      case 'offline': return '#dc3545';
      case 'unknown': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'unknown': return 'Unknown';
      default: return 'Unknown';
    }
  };

  return (
    <div className="vehicle-info">
      <div className="vehicle-info-header">
        <h3>Vehicle Information</h3>
        <p>View detailed information about your tracked vehicles</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="vehicle-info-content">
        <div className="vehicle-list">
          <h4>Tracked Vehicles</h4>
          <div className="vehicles">
            {vehicles.map((vehicle) => {
              const device = getDeviceByVehicleId(vehicle.id);
              if (!device) return null;

              return (
                <div
                  key={vehicle.id}
                  className={`vehicle-card ${selectedDevice?.id === device.id ? 'selected' : ''}`}
                  onClick={() => onDeviceSelect && onDeviceSelect(device)}
                >
                  <div className="vehicle-header">
                    <h5>{vehicle.vehicle_register_number}</h5>
                    <div 
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(device.status) }}
                    >
                      {getStatusText(device.status)}
                    </div>
                  </div>
                  <div className="vehicle-details">
                    <p><strong>Make:</strong> {vehicle.make_company}</p>
                    <p><strong>Model:</strong> {vehicle.model_number}</p>
                    <p><strong>Device ID:</strong> {device.uniqueId}</p>
                    <p><strong>Last Update:</strong> {formatDate(vehicle.last_position_update)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="vehicle-details-panel">
          {selectedDevice && vehicleDetails ? (
            <div className="details-content">
              <div className="details-header">
                <h4>Device Details</h4>
                <div className="device-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(vehicleDetails.status) }}
                  >
                    {getStatusText(vehicleDetails.status)}
                  </span>
                </div>
              </div>

              <div className="details-sections">
                <div className="detail-section">
                  <h5>Basic Information</h5>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Device Name:</span>
                      <span className="value">{vehicleDetails.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Unique ID:</span>
                      <span className="value">{vehicleDetails.uniqueId}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Model:</span>
                      <span className="value">{vehicleDetails.model || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Category:</span>
                      <span className="value">{vehicleDetails.category || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Status:</span>
                      <span className="value">{getStatusText(vehicleDetails.status)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Last Update:</span>
                      <span className="value">{formatDate(vehicleDetails.lastUpdate)}</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const vehicle = getVehicleByDeviceId(vehicleDetails.id);
                  if (vehicle) {
                    return (
                      <div className="detail-section">
                        <h5>Vehicle Information</h5>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Registration Number:</span>
                            <span className="value">{vehicle.vehicle_register_number}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Make Company:</span>
                            <span className="value">{vehicle.make_company}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Model Number:</span>
                            <span className="value">{vehicle.model_number}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Engine Number:</span>
                            <span className="value">{vehicle.engine_number || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Chassis Number:</span>
                            <span className="value">{vehicle.chassis_number || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Year of Manufacture:</span>
                            <span className="value">{vehicle.year_of_manufacture || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const vehicle = getVehicleByDeviceId(vehicleDetails.id);
                  if (vehicle && vehicle.owner) {
                    return (
                      <div className="detail-section">
                        <h5>Owner Information</h5>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Owner Name:</span>
                            <span className="value">{vehicle.owner.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">CNIC:</span>
                            <span className="value">{vehicle.owner.cnic}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Contact:</span>
                            <span className="value">{vehicle.owner.contact || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Address:</span>
                            <span className="value">{vehicle.owner.address || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const vehicle = getVehicleByDeviceId(vehicleDetails.id);
                  if (vehicle && vehicle.driver) {
                    return (
                      <div className="detail-section">
                        <h5>Driver Information</h5>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Driver Name:</span>
                            <span className="value">{vehicle.driver.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">CNIC:</span>
                            <span className="value">{vehicle.driver.cnic}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Contact:</span>
                            <span className="value">{vehicle.driver.contact || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">License Number:</span>
                            <span className="value">{vehicle.driver.driving_license_number || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">License Expiry:</span>
                            <span className="value">{formatDate(vehicle.driver.driving_license_expiry_date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const vehicle = getVehicleByDeviceId(vehicleDetails.id);
                  if (vehicle && vehicle.conductor) {
                    return (
                      <div className="detail-section">
                        <h5>Conductor Information</h5>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Conductor Name:</span>
                            <span className="value">{vehicle.conductor.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">CNIC:</span>
                            <span className="value">{vehicle.conductor.cnic}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Contact:</span>
                            <span className="value">{vehicle.conductor.contact || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <h4>Select a Vehicle</h4>
              <p>Choose a tracked vehicle from the list to view its detailed information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleInfo;


import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function DriverView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDriver() {
      setLoading(true);
      const res = await fetch(`/api/drivers/${id}`);
      if (res.ok) {
        setDriver(await res.json());
      }
      setLoading(false);
    }
    fetchDriver();
  }, [id]);

  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate this driver?')) return;
    await fetch(`/api/drivers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    });
    navigate('/drivers');
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!driver) return <div className="p-8 text-red-600">Driver not found</div>;

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white rounded shadow p-8">
      <h1 className="text-2xl font-bold mb-4">Driver Details</h1>
      <div className="mb-4">
        <div><strong>Name:</strong> {driver.name}</div>
        <div><strong>CNIC:</strong> {driver.cnic}</div>
        <div><strong>Contact:</strong> {driver.contact}</div>
        <div><strong>License #:</strong> {driver.driving_license_number}</div>
        <div><strong>License Category:</strong> {driver.driving_license_category}</div>
        <div><strong>License Expiry:</strong> {driver.driving_license_expiry_date ? new Date(driver.driving_license_expiry_date).toLocaleDateString() : ''}</div>
        <div><strong>Vehicle Registration:</strong> 
          {driver.vehicle_registration_numbers && driver.vehicle_registration_numbers.length > 0 ? (
            <div className="mt-1">
              {driver.vehicle_registration_numbers.map((reg, index) => (
                <Badge key={index} variant="outline" className="mr-1 mb-1">{reg}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-sm ml-2">No vehicles linked</span>
          )}
        </div>
        <div><strong>Status:</strong> <Badge variant={driver.status === 'active' ? 'approved' : 'secondary'}>{driver.status}</Badge></div>
        <div><strong>Created At:</strong> {driver.created_at ? new Date(driver.created_at).toLocaleString() : ''}</div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={() => navigate(`/drivers/${driver.id}/edit`)}>Edit</Button>
        {driver.status === 'active' && (
          <Button variant="destructive" onClick={handleDeactivate}>Deactivate</Button>
        )}
        <Button variant="outline" onClick={() => navigate('/drivers')}>Back</Button>
      </div>
    </div>
  );
} 
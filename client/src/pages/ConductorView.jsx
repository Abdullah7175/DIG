import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function ConductorView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conductor, setConductor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConductor() {
      setLoading(true);
      const res = await fetch(`/api/conductors/${id}`);
      if (res.ok) {
        setConductor(await res.json());
      }
      setLoading(false);
    }
    fetchConductor();
  }, [id]);

  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate this conductor?')) return;
    await fetch(`/api/conductors/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    });
    navigate('/conductors');
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!conductor) return <div className="p-8 text-red-600">Conductor not found</div>;

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white rounded shadow p-8">
      <h1 className="text-2xl font-bold mb-4">Conductor Details</h1>
      <div className="mb-4">
        <div><strong>Name:</strong> {conductor.name}</div>
        <div><strong>CNIC:</strong> {conductor.cnic}</div>
        <div><strong>Contact:</strong> {conductor.contact}</div>
        <div><strong>Vehicle Registration:</strong> 
          {conductor.vehicle_registration_numbers && conductor.vehicle_registration_numbers.length > 0 ? (
            <div className="mt-1">
              {conductor.vehicle_registration_numbers.map((reg, index) => (
                <Badge key={index} variant="outline" className="mr-1 mb-1">{reg}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-sm ml-2">No vehicles linked</span>
          )}
        </div>
        <div><strong>Status:</strong> <Badge variant={conductor.status === 'active' ? 'approved' : 'secondary'}>{conductor.status}</Badge></div>
        <div><strong>Created At:</strong> {conductor.created_at ? new Date(conductor.created_at).toLocaleString() : ''}</div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={() => navigate(`/conductors/${conductor.id}/edit`)}>Edit</Button>
        {conductor.status === 'active' && (
          <Button variant="destructive" onClick={handleDeactivate}>Deactivate</Button>
        )}
        <Button variant="outline" onClick={() => navigate('/conductors')}>Back</Button>
      </div>
    </div>
  );
} 
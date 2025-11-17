import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function OwnerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOwner() {
      setLoading(true);
      const res = await fetch(`/api/owners/${id}`);
      if (res.ok) {
        setOwner(await res.json());
      }
      setLoading(false);
    }
    fetchOwner();
  }, [id]);

  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate this owner?')) return;
    await fetch(`/api/owners/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    });
    navigate('/owners');
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!owner) return <div className="p-8 text-red-600">Owner not found</div>;

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white rounded shadow p-8">
      <h1 className="text-2xl font-bold mb-4">Owner Details</h1>
      <div className="mb-4">
        <div><strong>Name:</strong> {owner.name}</div>
        <div><strong>CNIC:</strong> {owner.cnic}</div>
        <div><strong>Contact:</strong> {owner.contact}</div>
        <div><strong>Address:</strong> {owner.address}</div>
        <div><strong>Vehicle Registration:</strong> 
          {owner.vehicle_registration_numbers && owner.vehicle_registration_numbers.length > 0 ? (
            <div className="mt-1">
              {owner.vehicle_registration_numbers.map((reg, index) => (
                <Badge key={index} variant="outline" className="mr-1 mb-1">{reg}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-sm ml-2">No vehicles linked</span>
          )}
        </div>
        <div><strong>Status:</strong> <Badge variant={owner.status === 'active' ? 'approved' : 'secondary'}>{owner.status}</Badge></div>
        <div><strong>Created At:</strong> {owner.created_at ? new Date(owner.created_at).toLocaleString() : ''}</div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={() => navigate(`/owners/${owner.id}/edit`)}>Edit</Button>
        {owner.status === 'active' && (
          <Button variant="destructive" onClick={handleDeactivate}>Deactivate</Button>
        )}
        <Button variant="outline" onClick={() => navigate('/owners')}>Back</Button>
      </div>
    </div>
  );
} 
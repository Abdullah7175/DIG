import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function OwnerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const [form, setForm] = useState({ name: '', cnic: '', contact: '', address: '', vehicle_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  useEffect(() => {
    async function fetchOwner() {
      setLoading(true);
      const res = await fetch(`/api/owners/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOwner(data);
        
        // Set vehicle search if owner has a linked vehicle
        if (data.vehicle_registration_numbers && data.vehicle_registration_numbers.length > 0) {
          setVehicleSearch(data.vehicle_registration_numbers[0]);
        }
        
        setForm({ name: data.name, cnic: data.cnic, contact: data.contact, address: data.address, vehicle_id: '' });
      }
      setLoading(false);
    }
    fetchOwner();
  }, [id]);

  useEffect(() => {
    const fetchVehicles = async () => {
      const res = await fetch('/api/vehicles?status=active');
      const data = await res.json();
      setVehicles(data.vehicles || []);
      
      // If we have a vehicle search term, find the matching vehicle ID
      if (vehicleSearch && data.vehicles) {
        const matchingVehicle = data.vehicles.find(v => v.vehicle_register_number === vehicleSearch);
        if (matchingVehicle) {
          setForm(f => ({ ...f, vehicle_id: matchingVehicle.id }));
        }
      }
    };
    fetchVehicles();
  }, [vehicleSearch]);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleVehicleSearch = (search) => {
    setVehicleSearch(search);
    setShowVehicleDropdown(true);
  };

  const selectVehicle = (vehicle) => {
    setForm(f => ({ ...f, vehicle_id: vehicle.id }));
    setVehicleSearch(vehicle.vehicle_register_number);
    setShowVehicleDropdown(false);
  };

  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.vehicle_register_number.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Validate that a vehicle is selected
    if (!form.vehicle_id) {
      alert('Please select a vehicle registration number');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`/api/owners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      navigate(`/owners/${id}`);
    } catch (error) {
      console.error('Error updating owner:', error);
      alert(`Error updating owner: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!owner) return <div className="p-8 text-red-600">Owner not found</div>;

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white rounded shadow p-8">
      <h1 className="text-2xl font-bold mb-4">Edit Owner</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="cnic">CNIC</Label>
          <Input id="cnic" name="cnic" value={form.cnic} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="contact">Contact</Label>
          <Input id="contact" name="contact" value={form.contact} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" value={form.address} onChange={handleChange} />
        </div>
        <div className="relative">
          <Label htmlFor="vehicle">Vehicle Registration *</Label>
          <Input 
            id="vehicle"
            value={vehicleSearch} 
            onChange={(e) => handleVehicleSearch(e.target.value)}
            onFocus={() => setShowVehicleDropdown(true)}
            placeholder="Search vehicle registration number..."
            required
          />
          {showVehicleDropdown && filteredVehicles.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
              {filteredVehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectVehicle(vehicle)}
                >
                  {vehicle.vehicle_register_number}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block font-medium">Status</label>
          <Badge variant={owner.status === 'active' ? 'approved' : 'secondary'}>{owner.status}</Badge>
        </div>
        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          <Button variant="outline" type="button" onClick={() => navigate(`/owners/${id}`)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
} 
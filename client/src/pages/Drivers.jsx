import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const navigate = useNavigate();

  const fetchDrivers = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      status,
      page: String(page),
      limit: String(limit),
    });
    const res = await fetch(`/api/drivers?${params.toString()}`);
    const data = await res.json();
    setDrivers(data.drivers);
    setTotalPages(data.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
    // eslint-disable-next-line
  }, [search, status, page]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this driver?')) return;
    await fetch(`/api/drivers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    });
    fetchDrivers();
  };

  return (
    <div className="max-w-5xl mx-auto mt-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link 
          to="/management" 
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to System Management
        </Link>
      </div>

      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Button onClick={() => navigate('/drivers/create')}>Create Driver</Button>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-2 py-1"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <table className="w-full border rounded shadow-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">CNIC</th>
            <th className="p-2 text-left">Contact</th>
            <th className="p-2 text-left">License #</th>
            <th className="p-2 text-left">License Category</th>
            <th className="p-2 text-left">License Expiry</th>
            <th className="p-2 text-left">Vehicle Registration</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9} className="p-4 text-center">Loading...</td></tr>
          ) : drivers.length === 0 ? (
            <tr><td colSpan={9} className="p-4 text-center">No drivers found.</td></tr>
          ) : drivers.map(driver => (
            <tr key={driver.id} className="border-t">
              <td className="p-2">{driver.name}</td>
              <td className="p-2">{driver.cnic}</td>
              <td className="p-2">{driver.contact}</td>
              <td className="p-2">{driver.driving_license_number}</td>
              <td className="p-2">{driver.driving_license_category}</td>
              <td className="p-2">{driver.driving_license_expiry_date ? new Date(driver.driving_license_expiry_date).toLocaleDateString() : ''}</td>
              <td className="p-2">
                {driver.vehicle_registration_numbers && driver.vehicle_registration_numbers.length > 0 ? (
                  <div className="space-y-1">
                    {driver.vehicle_registration_numbers.map((reg, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{reg}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">No vehicles</span>
                )}
              </td>
              <td className="p-2">
                <Badge variant={driver.status === 'active' ? 'approved' : 'secondary'}>{driver.status}</Badge>
              </td>
              <td className="p-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/drivers/${driver.id}`)}>View</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/drivers/${driver.id}/edit`)}>Edit</Button>
                {driver.status === 'active' && (
                  <Button size="sm" variant="destructive" onClick={() => handleDeactivate(driver.id)}>Deactivate</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between items-center mt-4">
        <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>Page {page} of {totalPages}</span>
        <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
} 
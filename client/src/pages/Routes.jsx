import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CRUDTable from '@/components/CRUDTable';
import { apiRequest } from '@/lib/queryClient';

export default function RoutesManagement() {
  const [terminals, setTerminals] = useState([]);

  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    try {
      const response = await apiRequest('GET', '/api/terminals?status=active');
      const data = await response.json();
      setTerminals(data.terminals || []);
    } catch (error) {
      console.error('Error fetching terminals:', error);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'route_number', label: 'Route Number' },
    { key: 'route_name', label: 'Route Name' },
    { key: 'route_area_via', label: 'Via' },
    { key: 'terminal_name', label: 'Terminal' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created', render: (value) => new Date(value).toLocaleDateString() }
  ];

  const formFields = [
    { key: 'route_number', label: 'Route Number', placeholder: 'Enter route number', required: true },
    { key: 'route_name', label: 'Route Name', placeholder: 'Enter route name', required: true },
    { key: 'route_area_via', label: 'Route Area Via', placeholder: 'Enter route area via' },
    { 
      key: 'terminal_id', 
      label: 'Terminal', 
      type: 'select',
      options: terminals.map(terminal => ({ value: terminal.id, label: terminal.name }))
    },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  const handleCreate = async (data) => {
    const response = await apiRequest('POST', '/api/routes', data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create route');
    }
    return response.json();
  };

  const handleUpdate = async (id, data) => {
    const response = await apiRequest('PUT', `/api/routes/${id}`, data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update route');
    }
    return response.json();
  };

  const handleDelete = async (id) => {
    const response = await apiRequest('DELETE', `/api/routes/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete route');
    }
    return response.json();
  };

  return (
    <div className="p-6">
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

      <CRUDTable
        title="Routes"
        endpoint="/api/routes"
        columns={columns}
        formFields={formFields}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        searchField="route_name"
        additionalFilters={[]}
      />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CRUDTable from '@/components/CRUDTable';
import { apiRequest } from '@/lib/queryClient';

export default function Terminals() {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Terminal Name' },
    { key: 'location', label: 'Location' },
    { key: 'city', label: 'City' },
    { key: 'province', label: 'Province' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created', render: (value) => new Date(value).toLocaleDateString() }
  ];

  const formFields = [
    { key: 'name', label: 'Terminal Name', placeholder: 'Enter terminal name', required: true },
    { key: 'location', label: 'Location', placeholder: 'Enter location address' },
    { key: 'city', label: 'City', placeholder: 'Enter city name' },
    { key: 'province', label: 'Province', placeholder: 'Enter province name' },
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
    const response = await apiRequest('POST', '/api/terminals', data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create terminal');
    }
    return response.json();
  };

  const handleUpdate = async (id, data) => {
    const response = await apiRequest('PUT', `/api/terminals/${id}`, data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update terminal');
    }
    return response.json();
  };

  const handleDelete = async (id) => {
    const response = await apiRequest('DELETE', `/api/terminals/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete terminal');
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
        title="Terminals"
        endpoint="/api/terminals"
        columns={columns}
        formFields={formFields}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}

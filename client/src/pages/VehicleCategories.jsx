import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CRUDTable from '@/components/CRUDTable';
import { apiRequest } from '@/lib/queryClient';

export default function VehicleCategories() {
  const [categories, setCategories] = useState([]);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created', render: (value) => new Date(value).toLocaleDateString() }
  ];

  const formFields = [
    { key: 'name', label: 'Category Name', placeholder: 'Enter category name', required: true },
    { key: 'description', label: 'Description', placeholder: 'Enter description', type: 'textarea' },
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
    const response = await apiRequest('POST', '/api/vehicle-categories', data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create category');
    }
    return response.json();
  };

  const handleUpdate = async (id, data) => {
    const response = await apiRequest('PUT', `/api/vehicle-categories/${id}`, data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update category');
    }
    return response.json();
  };

  const handleDelete = async (id) => {
    const response = await apiRequest('DELETE', `/api/vehicle-categories/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete category');
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
        title="Vehicle Categories"
        endpoint="/api/vehicle-categories"
        columns={columns}
        formFields={formFields}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CRUDTable from '@/components/CRUDTable';
import { apiRequest } from '@/lib/queryClient';

export default function VehicleTypes() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiRequest('GET', '/api/vehicle-categories?status=active');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Type Name' },
    { key: 'description', label: 'Description' },
    { key: 'category_name', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created', render: (value) => new Date(value).toLocaleDateString() }
  ];

  const formFields = [
    { key: 'name', label: 'Type Name', placeholder: 'Enter type name', required: true },
    { key: 'description', label: 'Description', placeholder: 'Enter description', type: 'textarea' },
    { 
      key: 'vehicle_category_id', 
      label: 'Vehicle Category', 
      type: 'select',
      required: true,
      options: categories.map(cat => ({ value: cat.id, label: cat.name }))
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
    const response = await apiRequest('POST', '/api/vehicle-types', data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create vehicle type');
    }
    return response.json();
  };

  const handleUpdate = async (id, data) => {
    const response = await apiRequest('PUT', `/api/vehicle-types/${id}`, data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update vehicle type');
    }
    return response.json();
  };

  const handleDelete = async (id) => {
    const response = await apiRequest('DELETE', `/api/vehicle-types/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete vehicle type');
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
        title="Vehicle Types"
        endpoint="/api/vehicle-types"
        columns={columns}
        formFields={formFields}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        additionalFilters={[]}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CRUDTable from '@/components/CRUDTable';
import { apiRequest } from '@/lib/queryClient';

export default function TrackerCompanies() {
  const [trackerCompanies, setTrackerCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'contact_number', label: 'Contact Number', sortable: false },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'website', label: 'Website', sortable: false },
    { key: 'address', label: 'Address', sortable: false },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'created_at', label: 'Created At', sortable: true, type: 'date' },
  ];

  const formFields = [
    {
      key: 'name',
      label: 'Company Name',
      type: 'text',
      required: true,
      placeholder: 'Enter company name'
    },
    {
      key: 'contact_number',
      label: 'Contact Number',
      type: 'text',
      required: false,
      placeholder: 'Enter contact number'
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      required: false,
      placeholder: 'Enter email address'
    },
    {
      key: 'website',
      label: 'Website',
      type: 'text',
      required: false,
      placeholder: 'Enter website URL'
    },
    {
      key: 'address',
      label: 'Address',
      type: 'textarea',
      required: false,
      placeholder: 'Enter company address'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' }
      ],
      placeholder: 'Select status'
    }
  ];

  const handleCreate = async (data) => {
    const response = await apiRequest('POST', '/api/tracker-companies', data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create tracker company');
    }
    return response.json();
  };

  const handleUpdate = async (id, data) => {
    const response = await apiRequest('PUT', `/api/tracker-companies/${id}`, data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update tracker company');
    }
    return response.json();
  };

  const handleDelete = async (id) => {
    const response = await apiRequest('DELETE', `/api/tracker-companies/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete tracker company');
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
        title="Tracker Companies"
        endpoint="/api/tracker-companies"
        columns={columns}
        formFields={formFields}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}

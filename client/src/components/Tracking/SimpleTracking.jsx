import React from 'react';

const SimpleTracking = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          GPS Tracking System
        </h1>
        <p className="text-gray-600 mb-4">
          This is a simple tracking page to test basic functionality.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Status: Basic Tracking Page Working
          </h3>
          <p className="text-blue-700">
            The tracking system is being set up. More features will be added gradually.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleTracking;

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

const DOCUMENT_TYPES = [
  { key: 'owner_cnic_copy', label: 'Owner CNIC Copy' },
  { key: 'vehicle_registration_book', label: 'Vehicle Registration Book Copy' },
  { key: 'vehicle_picture', label: 'Vehicle Picture' },
  { key: 'vehicle_fitness_certificate', label: 'Vehicle Fitness Certificate' },
  { key: 'conductor_cnic', label: 'Conductor CNIC' },
  { key: 'route_permit', label: 'Route Permit' },
  { key: 'route_noc', label: 'Route NOC' },
  { key: 'driver_cnic_copy', label: 'Driver CNIC Copy' },
  { key: 'owner_driving_license_copy', label: 'Owner Driving License Copy' },
  { key: 'driver_picture', label: 'Driver Picture' },
  { key: 'conductor_picture', label: 'Conductor Picture' },
];

export default function VehicleView() {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();

  useEffect(() => {
    async function fetchVehicle() {
      setLoading(true);
      const res = await apiRequest("GET", `/api/vehicles/${id}`);
      const data = await res.json();
      setVehicle(data);
      setLoading(false);
    }
    fetchVehicle();
  }, [id]);

  const handlePrint = () => {
    if (!printRef.current) return;
    
    // Clone the content and modify for printing
    const printElement = printRef.current.cloneNode(true);
    
    // Replace images with checkboxes in the cloned element
    const images = printElement.querySelectorAll('img');
    images.forEach(img => {
      const checkbox = document.createElement('div');
      checkbox.innerHTML = `
        <div style="display: flex; align-items: center; margin: 4px 0;">
          <input type="checkbox" style="margin-right: 8px;" ${img.src ? 'checked' : ''}>
          <span style="font-size: 12px;">${img.alt || 'Document'}</span>
        </div>
      `;
      img.parentNode.replaceChild(checkbox, img);
    });
    
    const printContents = printElement.innerHTML;
    const printWindow = window.open('', '', 'height=900,width=800');
    printWindow.document.write('<html><head><title>Vehicle Details - Print</title>');
    printWindow.document.write(`
      <style>
        body { 
          background: white; 
          font-family: Arial, sans-serif; 
          margin: 20px;
        }
        @media print { 
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin-right: 8px;
        }
        .print-checkbox {
          display: flex;
          align-items: center;
          margin: 4px 0;
          font-size: 12px;
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContents);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!vehicle) return <div className="p-8 text-red-600">Vehicle not found</div>;

  const isBus = vehicle.vehicle_category === 'bus';

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex justify-between mb-4">
        <Button variant="outline" onClick={() => navigate("/database")}>Back to Database</Button>
        <Button variant="outline" onClick={handlePrint}>Print</Button>
      </div>
      <div ref={printRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print:p-0">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
          <div className="flex items-center space-x-4">
            <img src="/logo.png" alt="DIG Traffic Karachi" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-xl font-bold uppercase">COMMERCIAL VEHICLE INFORMATION-MANAGEMENT SYSTEM</h1>
              <div className="font-semibold">CVI-MS Form</div>
              <div className="font-semibold">DIG Traffic Karachi</div>
            </div>
          </div>
          <div className="text-xs text-right">Association Affiliation (if any)</div>
        </div>
        {/* VEHICLE DETAILS */}
        <section className="mb-8">
          <h2 className="bg-black text-white px-4 py-2 rounded-t font-semibold text-lg">VEHICLE DETAILS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-t-0 border-gray-200 p-4">
            <div><strong>Vehicle register number:</strong><br/>{vehicle.vehicle_register_number}</div>
            <div><strong>Registration Region:</strong><br/>{vehicle.registration_region}</div>
            <div><strong>Vehicle owner name (on book):</strong><br/>{vehicle.vehicle_owner_name_on_book}</div>
            <div><strong>Book Number:</strong><br/>{vehicle.book_number}</div>
            <div><strong>Engine Number:</strong><br/>{vehicle.engine_number}</div>
            <div><strong>Chassis Number:</strong><br/>{vehicle.chassis_number}</div>
            <div><strong>Make Company:</strong><br/>{vehicle.make_company}</div>
            <div><strong>Model Number:</strong><br/>{vehicle.model_number}</div>
            <div><strong>Seating Capacity:</strong><br/>{vehicle.seating_capacity}</div>
            <div><strong>Vehicle Category:</strong><br/>{vehicle.vehicle_category}</div>
            <div><strong>Vehicle Body Color:</strong><br/>{vehicle.vehicle_body_color}</div>
            <div><strong>Wheels:</strong><br/>{vehicle.wheels}</div>
            <div><strong>Passenger Doors / Emergency Exit:</strong><br/>{vehicle.passenger_doors_emergency_exit}</div>
            <div><strong>Fuel Type:</strong><br/>{vehicle.fuel_type}</div>
            <div><strong>Terminal Name:</strong><br/>{vehicle.terminal_name}</div>
            {isBus && <><div><strong>Route Number:</strong><br/>{vehicle.route_number}</div>
            <div><strong>Route Name:</strong><br/>{vehicle.route_name}</div>
            <div><strong>Route Area Via:</strong><br/>{vehicle.route_area_via}</div></>}
          </div>
        </section>
        {/* OWNER DETAILS */}
        <section className="mb-8">
          <h2 className="bg-black text-white px-4 py-2 rounded-t font-semibold text-lg">OWNER DETAILS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-t-0 border-gray-200 p-4">
            <div><strong>Owner Name:</strong><br/>{vehicle.owner?.name}</div>
            <div><strong>CNIC#:</strong><br/>{vehicle.owner?.cnic}</div>
            <div><strong>Contact#:</strong><br/>{vehicle.owner?.contact}</div>
            <div><strong>Address:</strong><br/>{vehicle.owner?.address}</div>
          </div>
        </section>
        {/* DRIVER DETAILS */}
        <section className="mb-8">
          <h2 className="bg-black text-white px-4 py-2 rounded-t font-semibold text-lg">DRIVER DETAILS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-t-0 border-gray-200 p-4">
            <div><strong>Driver Name:</strong><br/>{vehicle.driver?.name}</div>
            <div><strong>CNIC#:</strong><br/>{vehicle.driver?.cnic}</div>
            <div><strong>Contact#:</strong><br/>{vehicle.driver?.contact}</div>
            <div><strong>Driving License Number:</strong><br/>{vehicle.driver?.driving_license_number}</div>
            <div><strong>Driving License Category:</strong><br/>{vehicle.driver?.driving_license_category}</div>
            <div><strong>Driving License Expiry Date:</strong><br/>{vehicle.driver?.driving_license_expiry_date ? new Date(vehicle.driver?.driving_license_expiry_date).toLocaleDateString() : ""}</div>
          </div>
        </section>
        {/* CONDUCTOR DETAILS (bus only) */}
        {isBus && (
          <section className="mb-8">
            <h2 className="bg-black text-white px-4 py-2 rounded-t font-semibold text-lg">CONDUCTOR / HELPER DETAILS</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-t-0 border-gray-200 p-4">
              <div><strong>Helper Name:</strong><br/>{vehicle.conductor?.name}</div>
              <div><strong>CNIC#:</strong><br/>{vehicle.conductor?.cnic}</div>
              <div><strong>Contact#:</strong><br/>{vehicle.conductor?.contact}</div>
            </div>
          </section>
        )}
        {/* DOCUMENTS CHECKLIST */}
        <section className="mb-8">
          <h2 className="font-semibold text-lg mb-2">Required Documents Checklist</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DOCUMENT_TYPES.filter(doc => {
              if (["conductor_cnic", "conductor_picture", "route_permit", "route_noc"].includes(doc.key)) {
                return isBus;
              }
              return true;
            }).map((doc) => {
              const found = vehicle.documents?.find((d) => d.document_type === doc.key);
              return (
                <div key={doc.key} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium">{doc.label}</span>
                  {found && found.file_path ? (
                    found.file_path.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <a href={found.file_path} target="_blank" rel="noopener noreferrer">
                        <img src={found.file_path} alt={doc.label} className="h-16 w-16 object-cover border rounded" />
                      </a>
                    ) : (
                      <a href={found.file_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                    )
                  ) : (
                    <span className="text-gray-400">Not Provided</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        {/* CONFIRMATION */}
        <section className="mb-8">
          <h2 className="font-semibold text-lg mb-2">CONFIRMATION تصدیق</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            "I hereby confirm that the above information is correct and true. I understand that I am fully responsible for the accuracy of the information provided in this declaration, and I accept any consequences that may arise if any of the information is found to be incorrect or false."
          </p>
          <p className="text-sm text-gray-700 mt-2 leading-relaxed" dir="rtl">
            میں اس بات کی تصدیق کرتا ہوں کہ اوپر دی گئی معلومات درست اور صحیح ہیں۔ میں سمجھتا ہوں کہ اس اعلان میں فراہم کردہ معلومات کی درستگی کے لیے میں مکمل طور پر ذمہ دار ہوں اور اگر کوئی بھی معلومات غلط یا جھوٹی پائی جائیں تو میں اس کے نتائج کو قبول کرتا ہوں۔
          </p>
        </section>
        <div className="flex justify-between items-center mt-8">
          <div className="text-sm text-gray-600">
            <p>Applicant Signature & Stamp</p>
            <div className="border-b border-gray-300 w-48 mt-8"></div>
          </div>
          <div className="text-sm text-gray-600 text-right">
            <p>Dated</p>
            <div className="border-b border-gray-300 w-32 mt-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
} 
import { X, Download, Printer } from "lucide-react";

export default function QRModal({ isOpen, onClose, qrCode, registrationNumber }) {
  if (!isOpen) return null;

  const handleDownload = () => {
    if (qrCode) {
      const link = document.createElement('a');
      link.download = `qr-code-${registrationNumber}.png`;
      link.href = qrCode;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${registrationNumber}</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .qr-container { text-align: center; }
            img { max-width: 300px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>Vehicle QR Code</h2>
            <p>Registration: ${registrationNumber}</p>
            <img src="${qrCode}" alt="QR Code" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle QR Code</h3>
          <div className="bg-gray-100 p-6 rounded-lg mb-4">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto" />
            ) : (
              <div className="w-48 h-48 mx-auto bg-white border border-gray-300 rounded flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <div className="text-4xl mb-2">⊞</div>
                  <div>QR Code</div>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Registration: <span className="font-medium">{registrationNumber}</span>
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

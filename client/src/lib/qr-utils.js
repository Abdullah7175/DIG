// QR Code utilities for scanning and generation
export const scanQRCode = async () => {
  try {
    // Check if the browser supports the BarcodeDetector API
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new BarcodeDetector({
        formats: ['qr_code']
      });
      
      // Get user media (camera)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      return stream;
    } else {
      throw new Error('BarcodeDetector not supported');
    }
  } catch (error) {
    console.error('Error accessing camera:', error);
    throw error;
  }
};

export const parseQRData = (qrString) => {
  try {
    return JSON.parse(qrString);
  } catch (error) {
    // If it's not JSON, return as plain text
    return { raw: qrString };
  }
};

export const validateQRData = (qrData) => {
  // Check if QR data has required fields
  if (typeof qrData === 'object' && qrData.registration_number) {
    return true;
  }
  return false;
};

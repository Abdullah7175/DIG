import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Shield, CheckCircle, History, Upload, Printer, Share } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function QRVerify() {
  const [qrData, setQrData] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const { toast } = useToast();

  const { data: recentVerifications } = useQuery({
    queryKey: ["/api/verifications/recent"],
  });

  const verifyMutation = useMutation({
    mutationFn: (data) => apiRequest("POST", "/api/qr/verify", data),
    onSuccess: (response) => {
      const result = response.json();
      setVerificationResult(result);
      toast({
        title: "Verification Complete",
        description: result.success ? "Vehicle verified successfully" : "Vehicle not found",
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify QR code",
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    if (!qrData.trim()) {
      toast({
        title: "Error",
        description: "Please enter QR code data",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try to parse QR data as JSON
      const parsedData = JSON.parse(qrData.trim());
      
      // If it contains a public_url, redirect to it
      if (parsedData.public_url) {
        window.open(parsedData.public_url, '_blank');
        toast({
          title: "Success",
          description: "Opening vehicle details...",
        });
        return;
      }
    } catch (e) {
      // If not JSON, treat as regular QR data
    }

    // Check if the QR data is just a URL
    if (qrData.trim().startsWith('http://') || qrData.trim().startsWith('https://')) {
      window.open(qrData.trim(), '_blank');
      toast({
        title: "Success",
        description: "Opening vehicle details...",
      });
      return;
    }

    verifyMutation.mutate({
      qrData: qrData.trim(),
      location: "Field Verification", // Could be enhanced with geolocation
    });
  };

  const startQRScan = () => {
    // In a real implementation, this would open the camera
    toast({
      title: "Camera Access",
      description: "QR Scanner would be initialized here using camera API",
    });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code Verification</h2>
        <p className="text-gray-600">Scan vehicle QR codes for instant verification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Scanner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Camera className="mr-2 text-primary" />
            QR Code Scanner
          </h3>
          
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="text-6xl text-gray-400 mb-4">⊞</div>
              <p className="text-gray-600 font-medium">Position QR code within frame</p>
              <p className="text-sm text-gray-500 mt-2">Camera will automatically detect the code</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or paste QR code data manually:
            </label>
            <Textarea
              value={qrData}
              onChange={(e) => setQrData(e.target.value)}
              placeholder="Paste QR code data here..."
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={startQRScan}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Camera className="mr-2 h-4 w-4" />
              Start Scanning
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifyMutation.isPending || !qrData.trim()}
              variant="outline"
            >
              {verifyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Verify
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Verification Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="mr-2 text-secondary" />
            Verification Results
          </h3>
          
          {verificationResult ? (
            <>
              {/* Success State */}
              <div className={`border rounded-lg p-4 mb-4 ${
                verificationResult.success 
                  ? 'border-secondary/20 bg-secondary/5' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {verificationResult.success ? (
                      <CheckCircle className="text-secondary text-xl" />
                    ) : (
                      <div className="text-red-500 text-xl">⚠</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      verificationResult.success ? 'text-secondary' : 'text-red-600'
                    }`}>
                      {verificationResult.success 
                        ? 'Vehicle Verified Successfully' 
                        : 'Vehicle Verification Failed'}
                    </h4>
                    {verificationResult.vehicle && (
                      <p className="text-sm text-gray-600 mt-1">
                        Registration: <span className="font-medium">{verificationResult.vehicle.registration_number}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              {verificationResult.success && verificationResult.vehicle && (
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Registration Number:</span>
                    <span className="font-medium text-gray-900">{verificationResult.vehicle.registration_number}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Vehicle Type:</span>
                    <span className="font-medium text-gray-900 capitalize">{verificationResult.vehicle.vehicle_type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Make & Model:</span>
                    <span className="font-medium text-gray-900">{verificationResult.vehicle.make_model}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Owner:</span>
                    <span className="font-medium text-gray-900">{verificationResult.vehicle.owner?.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      verificationResult.vehicle.status === 'active' 
                        ? 'bg-secondary/10 text-secondary' 
                        : 'bg-warning/10 text-warning'
                    }`}>
                      <div className="w-1 h-1 rounded-full bg-current mr-1"></div>
                      {verificationResult.vehicle.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Last Verified:</span>
                    <span className="font-medium text-gray-900">Just now</span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex space-x-3">
                <Button variant="outline" className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Scan or enter QR code data to verify vehicle</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Verifications */}
      {recentVerifications && recentVerifications.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <History className="mr-2 text-primary" />
            Recent Verifications
          </h3>
          
          <div className="space-y-3">
            {recentVerifications.slice(0, 5).map((verification, index) => (
              <div key={verification.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    verification.verification_result === 'success' ? 'bg-secondary' : 'bg-accent'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">Vehicle #{verification.vehicle_id || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(verification.verified_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  verification.verification_result === 'success' ? 'text-secondary' : 'text-accent'
                }`}>
                  {verification.verification_result === 'success' ? 'Verified' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

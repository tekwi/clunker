import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface OdometerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function OdometerInput({ value, onChange, placeholder = "Enter mileage", disabled }: OdometerInputProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedText, setDetectedText] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setShowCamera(true);
    } catch (error) {
      toast({
        title: "Camera Access Failed",
        description: "Unable to access camera. Please enter odometer reading manually.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setDetectedText([]);
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        // Create FormData for the image
        const formData = new FormData();
        formData.append('image', blob, 'odometer.jpg');

        // Simple OCR simulation - in production, you'd send this to an OCR API
        // For now, we'll extract potential numbers from a mock response
        const mockOcrResponse = await simulateOCR(blob);
        setDetectedText(mockOcrResponse);
        
        if (mockOcrResponse.length > 0) {
          toast({
            title: "Text Detected",
            description: `Found ${mockOcrResponse.length} potential readings. Select the correct one.`,
          });
        } else {
          toast({
            title: "No Numbers Detected",
            description: "Try repositioning the camera to get a clearer view of the odometer.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Processing Failed",
          description: "Unable to process the image. Please try again or enter manually.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.8);
  };

  // Mock OCR function - in production, replace with actual OCR API call
  const simulateOCR = async (blob: Blob): Promise<string[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock detected numbers that might appear on an odometer
    const mockDetections = [
      "123,456",
      "123456", 
      "123,456 miles",
      "456",
      "123"
    ];
    
    // Return 1-3 random detections
    const numDetections = Math.floor(Math.random() * 3) + 1;
    return mockDetections.slice(0, numDetections);
  };

  const selectDetectedText = (text: string) => {
    // Extract just the numbers and format
    const numbers = text.replace(/[^\d]/g, '');
    if (numbers) {
      // Format with commas for readability
      const formatted = parseInt(numbers).toLocaleString();
      onChange(formatted);
      stopCamera();
      toast({
        title: "Odometer Reading Set",
        description: `Set to ${formatted} miles`,
      });
    }
  };

  const formatOdometerValue = (inputValue: string) => {
    // Remove all non-digit characters
    const numbers = inputValue.replace(/[^\d]/g, '');
    if (!numbers) return '';
    
    // Format with commas
    return parseInt(numbers).toLocaleString();
  };

  const handleManualInput = (inputValue: string) => {
    const formatted = formatOdometerValue(inputValue);
    onChange(formatted);
  };

  return (
    <div>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => handleManualInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-12"
          data-testid="input-odometer"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={startCamera}
          disabled={disabled}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary/80 h-8 w-8 p-0"
          data-testid="button-camera-odometer"
        >
          <i className="fas fa-camera text-lg"></i>
        </Button>
      </div>

      <Dialog open={showCamera} onOpenChange={stopCamera}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <i className="fas fa-camera mr-2 text-primary"></i>
              Scan Odometer Reading
            </DialogTitle>
            <DialogDescription>
              Position your camera to clearly show the odometer display, then tap capture to detect the mileage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Camera Preview */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Overlay guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white border-dashed rounded-lg p-4 bg-black/20">
                  <p className="text-white text-sm text-center">
                    Center odometer display here
                  </p>
                </div>
              </div>
            </div>

            {/* Capture Button */}
            <Button
              onClick={captureAndProcess}
              disabled={isProcessing}
              className="w-full"
              data-testid="button-capture-odometer"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-camera mr-2"></i>
                  Capture & Detect
                </>
              )}
            </Button>

            {/* Detected Text Options */}
            {detectedText.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Detected readings - tap to select:
                </p>
                <div className="flex flex-wrap gap-2">
                  {detectedText.map((text, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => selectDetectedText(text)}
                      data-testid={`badge-detected-${index}`}
                    >
                      {text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start">
                <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-2 text-sm"></i>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Tips for best results:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Ensure good lighting</li>
                    <li>Keep camera steady</li>
                    <li>Get close to the odometer</li>
                    <li>Make sure numbers are clearly visible</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
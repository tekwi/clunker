import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';

interface VinScannerProps {
  onVinDetected: (vin: string, wasScanned?: boolean) => void;
  onClose: () => void;
}

export function VinScanner({ onVinDetected, onClose }: VinScannerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualVin, setManualVin] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startCameraAndCapture = async () => {
    try {
      setError(null);
      setIsInitializing(true);

      // Request camera access with specific constraints for mobile
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Use rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Wait for video to be ready and start automatic capture
        setIsInitializing(false);

        // Auto-capture after 3 seconds to allow user to position the VIN
        captureTimeoutRef.current = setTimeout(() => {
          captureAndAnalyze();
        }, 3000);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please enter VIN manually.');
      setIsInitializing(false);
      setShowManualInput(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }
    setIsInitializing(false);
    setIsAnalyzing(false);
  };

  const handleManualSubmit = () => {
    if (manualVin.trim().length >= 17) {
      onVinDetected(manualVin.trim().toUpperCase());
      onClose();
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      // Create canvas to capture current frame
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      // Create Tesseract worker for OCR
      const worker = await createWorker('eng');

      // Perform OCR on the captured image
      const { data: { text } } = await worker.recognize(canvas);

      // Clean up worker
      await worker.terminate();

      // Extract VIN from detected text
      // VIN is 17 characters, alphanumeric, excluding I, O, Q
      const vinRegex = /[A-HJ-NPR-Z0-9]{17}/g;
      const matches = text.match(vinRegex);

      if (matches && matches.length > 0) {
        const detectedVin = matches[0].toUpperCase();
        // Pass the VIN with a flag indicating it was scanned (not manually entered)
        onVinDetected(detectedVin, true);
        onClose();
      } else {
        setError('Could not detect VIN from image. Please try again or enter manually.');
      }
    } catch (err) {
      console.error('VIN analysis error:', err);
      setError('Failed to analyze image. Please try again or enter manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Auto-start camera when component mounts
    startCameraAndCapture();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">VIN Scanner</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {showManualInput ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 mb-4">
              Camera not available. Please enter VIN manually:
            </div>
            <input
              type="text"
              value={manualVin}
              onChange={(e) => setManualVin(e.target.value.toUpperCase())}
              placeholder="Enter 17-character VIN"
              className="w-full p-3 border rounded-md text-center font-mono"
              maxLength={17}
              data-testid="input-manual-vin"
            />
            <Button 
              onClick={handleManualSubmit} 
              disabled={manualVin.length !== 17}
              className="w-full"
              data-testid="button-submit-manual-vin"
            >
              <Check className="h-4 w-4 mr-2" />
              Use This VIN
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                data-testid="video-vin-scanner"
              />
              <div className="absolute inset-0 border-2 border-white border-dashed m-4 rounded-md opacity-70"></div>
              <div className="absolute top-2 left-2 right-2 bg-black bg-opacity-50 text-white text-sm p-2 rounded">
                Position VIN within the frame
              </div>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-sm font-medium">Scanning VIN...</span>
                  </div>
                </div>
              )}
            </div>

            {isInitializing ? (
              <div className="text-center text-sm text-gray-600 flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing camera...</span>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-600">
                Auto-scan will start in 3 seconds...
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => setShowManualInput(true)} 
                variant="outline" 
                className="flex-1"
                disabled={isAnalyzing}
                data-testid="button-manual-entry"
              >
                Enter Manually
              </Button>
              <Button 
                onClick={captureAndAnalyze} 
                className="flex-1"
                disabled={isInitializing || isAnalyzing}
                data-testid="button-scan-now"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Scan Now
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
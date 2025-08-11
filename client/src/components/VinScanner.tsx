
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';

interface VinScannerProps {
  onVinDetected: (vin: string) => void;
  onClose: () => void;
}

export function VinScanner({ onVinDetected, onClose }: VinScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualVin, setManualVin] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);

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
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please enter VIN manually.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
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
        onVinDetected(detectedVin);
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
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan VIN</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {!isScanning ? (
          <div className="space-y-4">
            <Button onClick={startCamera} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
            
            <div className="text-center text-sm text-gray-500">or</div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter VIN manually:</label>
              <input
                type="text"
                value={manualVin}
                onChange={(e) => setManualVin(e.target.value.toUpperCase())}
                placeholder="Enter 17-character VIN"
                className="w-full p-2 border rounded-md"
                maxLength={17}
              />
              <Button 
                onClick={handleManualSubmit} 
                disabled={manualVin.length < 17}
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                Use VIN
              </Button>
            </div>
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
              />
              <div className="absolute inset-0 border-2 border-white border-dashed m-4 rounded-md opacity-50"></div>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              Position the VIN number within the frame
            </div>
            
            <div className="flex gap-2">
              <Button onClick={stopCamera} variant="outline" className="flex-1" disabled={isAnalyzing}>
                Stop Camera
              </Button>
              <Button 
                onClick={captureAndAnalyze} 
                className="flex-1"
                disabled={!videoRef.current || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Scan VIN
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

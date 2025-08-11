
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Camera, X, Check } from 'lucide-react';

interface OdometerInputProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
}

export function OdometerInput({ value, onChange, onClose }: OdometerInputProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualReading, setManualReading] = useState(value);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
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
      setError('Unable to access camera. Please enter reading manually.');
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
    onChange(manualReading);
    if (onClose) onClose();
  };

  const captureReading = () => {
    // Simulate odometer reading capture
    const simulatedReading = Math.floor(Math.random() * 200000).toString();
    onChange(simulatedReading);
    stopCamera();
    if (onClose) onClose();
  };

  useEffect(() => {
    setManualReading(value);
  }, [value]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isScanning) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="number"
            value={manualReading}
            onChange={(e) => setManualReading(e.target.value)}
            placeholder="Enter odometer reading"
            className="flex-1"
          />
          <Button onClick={startCamera} size="sm">
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <Button onClick={handleManualSubmit} className="w-full">
          <Check className="h-4 w-4 mr-2" />
          Use Reading
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan Odometer</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

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
            Position the odometer display within the frame
          </div>
          
          <div className="flex gap-2">
            <Button onClick={stopCamera} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={captureReading} className="flex-1">
              Capture Reading
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

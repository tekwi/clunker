import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ObjectUploader } from "@/components/ObjectUploader";
import { VinScanner } from "@/components/VinScanner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPricingForVin } from "@/lib/queryClient";

const submissionSchema = z.object({
  vin: z.string().min(17, "VIN must be 17 characters"),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  ownerName: z.string().min(1, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(10, "Phone number is required"),
  titleCondition: z.string().min(1, "Title condition is required"),
  titleInHand: z.string().min(1, "Please specify if you have the title in-hand"),
  vehicleCondition: z.string().min(1, "Vehicle condition is required"),
  odometerReading: z.string().min(1, "Odometer reading is required"),
  hasDamage: z.string().min(1, "Please specify if the vehicle has damage"),
  airbagDeployed: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  address: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

interface Step {
  id: string;
  title: string;
  subtitle?: string;
  fields?: (keyof SubmissionForm)[];
}

// VIN year character mapping
const VIN_YEAR_MAP: { [key: string]: number[] } = {
  'A': [1980, 2010], 'B': [1981, 2011], 'C': [1982, 2012], 'D': [1983, 2013],
  'E': [1984, 2014], 'F': [1985, 2015], 'G': [1986, 2016], 'H': [1987, 2017],
  'J': [1988, 2018], 'K': [1989, 2019], 'L': [1990, 2020], 'M': [1991, 2021],
  'N': [1992, 2022], 'P': [1993, 2023], 'R': [1994, 2024], 'S': [1995, 2025],
  'T': [1996, 2026], 'V': [1997, 2027], 'W': [1998, 2028], 'X': [1999, 2029],
  'Y': [2000, 2030], '1': [2001, 2031], '2': [2002, 2032], '3': [2003, 2033],
  '4': [2004, 2034], '5': [2005, 2035], '6': [2006, 2036], '7': [2007, 2037],
  '8': [2008, 2038], '9': [2009, 2039]
};

const getYearFromVin = (vin: string): number => {
  if (vin.length < 10) return new Date().getFullYear();

  const vinYearChar = vin.charAt(9).toUpperCase();
  const possibleYears = VIN_YEAR_MAP[vinYearChar] || [];

  if (possibleYears.length === 0) return new Date().getFullYear();

  // For VIN year characters that map to two possible years,
  // choose the later year (2010-2039 range) for newer vehicles
  // since we're past 2010 and most vehicles being processed are likely newer
  return Math.max(...possibleYears);
};

// Vehicle makes will be loaded from API

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Get Cash for Your Car",
    subtitle: "Submit your vehicle details and get an instant cash offer",
  },
  {
    id: "vin",
    title: "What's your VIN number?",
    subtitle: "You can find this on your dashboard or driver's side door",
    fields: ["vin"],
  },
  {
    id: "vehicle-info",
    title: "Tell us about your vehicle",
    subtitle: "Enter your vehicle's make, model, and year",
    fields: ["vehicleMake", "vehicleModel", "vehicleYear"],
  },
  {
    id: "odometer",
    title: "What's your current mileage?",
    subtitle: "Enter the odometer reading from your dashboard",
    fields: ["odometerReading"],
  },
  {
    id: "title-condition",
    title: "What's your title condition?",
    subtitle: "This affects the value of your vehicle",
    fields: ["titleCondition"],
  },
  {
    id: "title-in-hand",
    title: "Do you have the title in-hand and able to sign?",
    subtitle: "This is required to complete the sale",
    fields: ["titleInHand"],
  },
  {
    id: "vehicle-condition",
    title: "What's your vehicle's condition?",
    subtitle: "Be honest - this helps us give you the best offer",
    fields: ["vehicleCondition"],
  },
  {
    id: "damage",
    title: "Does your vehicle have any damage?",
    subtitle: "This includes accidents, dents, scratches, or mechanical issues",
    fields: ["hasDamage"],
  },
  {
    id: "airbag",
    title: "Are any airbags deployed?",
    subtitle: "This is important for safety and valuation purposes",
    fields: ["airbagDeployed"],
  },
  {
    id: "owner-info",
    title: "What's your name?",
    subtitle: "We'll use this for your cash offer",
    fields: ["ownerName"],
  },
  {
    id: "email",
    title: "What's your email?",
    subtitle: "We'll send your cash offer here",
    fields: ["email"],
  },
  {
    id: "phone",
    title: "What's your phone number?",
    subtitle: "We may need to contact you about your offer",
    fields: ["phoneNumber"],
  },
  {
    id: "location",
    title: "Where is your vehicle located?",
    subtitle: "This helps us arrange pickup if you accept our offer",
  },
  {
    id: "photos",
    title: "Add some photos",
    subtitle: "Take pictures of your vehicle's exterior, interior, and any damage",
  },
  {
    id: "review",
    title: "Ready to get your offer?",
    subtitle: "Review your information and submit",
  },
  {
    id: "success",
    title: "Submission Complete!",
    subtitle: "Your vehicle has been successfully submitted",
  },
];

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [vehicleMakes, setVehicleMakes] = useState<string[]>([]);
  const [vehicleModels, setVehicleModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);

  // Simple form with direct state management
  const [formData, setFormData] = useState<Partial<SubmissionForm>>({});

  const form = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      vin: "",
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: "",
      ownerName: "",
      email: "",
      phoneNumber: "",
      titleCondition: "",
      titleInHand: "",
      vehicleCondition: "",
      odometerReading: "",
      hasDamage: "",
      airbagDeployed: "",
      latitude: "",
      longitude: "",
      address: "",
      street: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  // Load vehicle makes on component mount
  useEffect(() => {
    fetchVehicleMakes();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (currentStep === STEPS.length - 1 && estimatedPrice && !offerAccepted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, estimatedPrice, offerAccepted, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptOffer = async () => {
    if (!submissionId) return;

    try {
      // Find the offer for this submission and update its status
      const response = await apiRequest("PUT", `/api/submissions/${submissionId}/offer/accept`, {});

      if (response.ok) {
        setOfferAccepted(true);
        toast({
          title: "Offer Accepted!",
          description: "We'll arrange pickup within 24 hours.",
        });
      } else {
        throw new Error("Failed to accept offer");
      }
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast({
        title: "Error",
        description: "Failed to accept offer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateField = (field: keyof SubmissionForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    form.setValue(field, value);

    // If make is changed, fetch models and clear current model
    if (field === 'vehicleMake' && value) {
      fetchVehicleModels(value);
      updateField('vehicleModel', ''); // Clear model when make changes
    }
  };

  const fetchVehicleMakes = async () => {
    setIsLoadingMakes(true);
    try {
      const response = await fetch('/api/vehicles/makes');
      if (response.ok) {
        const data = await response.json();
        const makes = data.map((item: { make: string }) => item.make);
        setVehicleMakes(makes);
      } else {
        console.error('Failed to fetch makes');
      }
    } catch (error) {
      console.error('Error fetching makes:', error);
    } finally {
      setIsLoadingMakes(false);
    }
  };

  const fetchVehicleModels = async (make: string) => {
    if (!make) {
      setVehicleModels([]);
      return;
    }

    setIsLoadingModels(true);
    try {
      const year = getFieldValue('vehicleYear') || new Date().getFullYear().toString();
      const response = await fetch(`/api/vehicles/models?make=${encodeURIComponent(make)}&year=${year}`);

      if (response.ok) {
        const data = await response.json();
        const models = data.map((item: { model: string }) => item.model);
        setVehicleModels(models);
      } else {
        console.error('Failed to fetch models');
        setVehicleModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setVehicleModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const getFieldValue = (field: keyof SubmissionForm): string => {
    return formData[field] || "";
  };

  const detectLocation = async () => {
    setIsDetectingLocation(true);

    try {
      if (!("geolocation" in navigator)) {
        throw new Error("Geolocation is not supported by this browser");
      }

      // Check if we already have permission
      let permissionStatus;
      if ("permissions" in navigator) {
        try {
          permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        } catch (e) {
          // Permissions API might not be available on some older browsers
        }
      }

      // If permission is denied, show helpful message
      if (permissionStatus?.state === 'denied') {
        throw {
          code: 1,
          message: "Location access was previously denied. Please enable location permission in your browser settings and try again."
        };
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout for mobile devices
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      updateField("latitude", latitude.toString());
      updateField("longitude", longitude.toString());

      let addressFound = false;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data && data.address) {
            const address = data.address;
            const displayName = data.display_name || "";

            // Update address fields
            updateField("address", displayName);
            updateField("street", `${address.house_number || ""} ${address.road || ""}`.trim());
            updateField("city", address.city || address.town || address.village || address.county || "");
            updateField("state", address.state || address.province || "");
            updateField("zip", address.postcode || "");

            addressFound = true;
          }
        }
      } catch (geocodeError) {
        console.log("Reverse geocoding failed:", geocodeError);
      }

      setLocationDetected(true);
      
      if (addressFound) {
        toast({
          title: "Location detected",
          description: "Your location and address have been automatically filled in.",
        });
      } else {
        toast({
          title: "Location coordinates detected",
          description: "We found your coordinates but couldn't auto-fill the address. Please enter your address manually.",
          variant: "default",
        });
      }

    } catch (error: any) {
      console.error("Geolocation error:", error);
      let title = "Location detection failed";
      let message = "Please enter your location manually.";

      if (error.code === 1) {
        title = "Location permission needed";
        message = "Please allow location access when prompted, then try again. You can also enable location services in your device settings.";
      } else if (error.code === 2) {
        title = "Location unavailable";
        message = "Your location could not be determined. Please check that location services are enabled and try again.";
      } else if (error.code === 3) {
        title = "Location request timed out";
        message = "The location request took too long. Please ensure you have a good connection and try again.";
      } else if (error.message) {
        message = error.message;
      }

      toast({
        title,
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: SubmissionForm & { photos: string[] }) => {
      // First submit the main form data
      const { photos, ...submissionData } = data;

      // Check for affiliate code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const affiliateCode = urlParams.get('ref');

      const finalData = {
        ...submissionData,
        affiliateCode: affiliateCode || undefined
      };

      const response = await apiRequest("POST", "/api/submissions", finalData);
      const result = await response.json();

      // Then submit photos if any
      if (photos.length > 0) {
        await apiRequest("POST", `/api/submissions/${result.submissionId}/photos`, {
          photoUrls: photos
        });
      }

      return result;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      setSubmissionId(data.submissionId);

      // Get pricing estimate
      setIsLoadingPrice(true);
      const vin = getFieldValue("vin");
      const year = getFieldValue("vehicleYear") ? parseInt(getFieldValue("vehicleYear")) : getYearFromVin(vin);

      try {
        const price = await getPricingForVin(
          vin, 
          year, 
          formData.vehicleMake || null, 
          formData.vehicleModel || null, 
          formData.vehicleYear || null
        );
        setEstimatedPrice(price);
      } catch (error) {
        console.error("Failed to get pricing:", error);
      } finally {
        setIsLoadingPrice(false);
      }

      // Move to success step
      setCurrentStep(STEPS.length - 1);

      toast({
        title: "Submission successful!",
        description: "Your vehicle information has been submitted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const validateStep = (stepIndex: number): boolean => {
    const step = STEPS[stepIndex];
    if (!step.fields) return true;

    // Skip validation for vehicle-info step since it's now optional
    if (step.id === "vehicle-info") return true;

    for (const field of step.fields) {
      const value = getFieldValue(field);
      if (!value || value.trim() === "") {
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }

    if (currentStep === 13) { // Photos step (updated index)
      if (uploadedPhotos.length === 0) {
        toast({
          title: "Photos required",
          description: "Please upload at least one photo to continue.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!validateStep(currentStep)) {
      toast({
        title: "Please fill in all required fields",
        description: "Complete the current step before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Skip airbag step if no damage reported
    if (currentStep === 7 && getFieldValue("hasDamage") === "no") { // damage step (updated index)
      setCurrentStep(currentStep + 2); // Skip airbag step
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = () => {
    if (uploadedPhotos.length === 0) {
      toast({
        title: "Photos required",
        description: "Please upload at least one photo of your vehicle.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      vin: getFieldValue("vin"),
      vehicleMake: getFieldValue("vehicleMake"),
      vehicleModel: getFieldValue("vehicleModel"),
      vehicleYear: getFieldValue("vehicleYear"),
      ownerName: getFieldValue("ownerName"),
      email: getFieldValue("email"),
      phoneNumber: getFieldValue("phoneNumber"),
      titleCondition: getFieldValue("titleCondition"),
      titleInHand: getFieldValue("titleInHand"),
      vehicleCondition: getFieldValue("vehicleCondition"),
      odometerReading: getFieldValue("odometerReading"),
      hasDamage: getFieldValue("hasDamage"),
      airbagDeployed: getFieldValue("airbagDeployed"),
      latitude: getFieldValue("latitude"),
      longitude: getFieldValue("longitude"),
      address: getFieldValue("address"),
      photos: uploadedPhotos,
    });
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    switch (step.id) {
      case "welcome":
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🚗</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
            <p className="text-gray-600 mb-8">We'll walk you through a few quick questions to get you the best cash offer for your vehicle.</p>
            <Button onClick={nextStep} size="lg" className="w-full max-w-sm">
              Let's Begin
            </Button>
          </div>
        );

      case "vin":
        return (
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input
                value={getFieldValue("vin")}
                onChange={(e) => updateField("vin", e.target.value)}
                placeholder="Enter 17-character VIN"
                className="text-lg p-4 h-14"
                maxLength={17}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowVinScanner(true)}
                className="h-14 px-6"
              >
                Scan
              </Button>
            </div>

            {/* Gamification: VIN Progress Visualization */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="text-4xl animate-pulse">🔍</div>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Your Vehicle's DNA</h3>
              <p className="text-sm text-gray-600 mb-4">
                Every VIN tells a unique story about your car's journey
              </p>
              <div className="flex justify-center space-x-2">
                {Array.from({ length: 17 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-8 rounded-sm transition-all duration-300 ${
                      i < getFieldValue("vin").length
                        ? "bg-green-500 shadow-sm"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {getFieldValue("vin").length}/17 characters entered
              </p>
            </div>

            <Dialog open={showVinScanner} onOpenChange={setShowVinScanner}>
              <DialogContent className="max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>VIN Scanner</DialogTitle>
                </DialogHeader>
                <VinScanner
                  onVinDetected={(vin, wasScanned) => {
                    updateField("vin", vin);
                    // Store whether this VIN was scanned for later use in pricing
                    if (wasScanned) {
                      updateField("vinWasScanned", true);
                    }
                    setShowVinScanner(false);
                  }}
                  onClose={() => setShowVinScanner(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        );

      case "vehicle-info":
        return (
          <div className="space-y-6">
            <Input
              value={getFieldValue("vehicleYear")}
              onChange={(e) => {
                const year = e.target.value;
                updateField("vehicleYear", year);
                // Refetch models if make is already selected and year changes
                const currentMake = getFieldValue("vehicleMake");
                if (currentMake && year) {
                  fetchVehicleModels(currentMake);
                }
              }}
              type="number"
              placeholder="Year (e.g., 2020)"
              className="text-lg p-4 h-14"
              min="1900"
              max={new Date().getFullYear() + 1}
            />

            <Select
              value={getFieldValue("vehicleMake")}
              onValueChange={(value) => updateField("vehicleMake", value)}
              disabled={isLoadingMakes}
            >
              <SelectTrigger className="text-lg p-4 h-14">
                <SelectValue placeholder={isLoadingMakes ? "Loading makes..." : "Select vehicle make"} />
              </SelectTrigger>
              <SelectContent>
                {vehicleMakes.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={getFieldValue("vehicleModel")}
              onValueChange={(value) => updateField("vehicleModel", value)}
              disabled={!getFieldValue("vehicleMake") || isLoadingModels}
            >
              <SelectTrigger className="text-lg p-4 h-14">
                <SelectValue
                  placeholder={
                    !getFieldValue("vehicleMake")
                      ? "Select make first"
                      : isLoadingModels
                        ? "Loading models..."
                        : "Select vehicle model"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vehicleModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-center pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={nextStep}
                className="text-gray-500 hover:text-gray-700"
              >
                Skip this step →
              </Button>
            </div>
          </div>
        );

      case "odometer":
        return (
          <div className="space-y-6">
            <Input
              value={getFieldValue("odometerReading")}
              onChange={(e) => updateField("odometerReading", e.target.value)}
              type="tel"
              placeholder="Enter mileage"
              className="text-lg p-4 h-14"
              inputMode="numeric"
              pattern="[0-9]*"
            />

            {/* Gamification: Mileage Journey Visualization */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🛣️</div>
                <h3 className="font-semibold text-gray-800">Miles of Memories</h3>
              </div>
              
              {getFieldValue("odometerReading") && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Your Journey:</span>
                    <span className="font-bold text-orange-600">
                      {Number(getFieldValue("odometerReading")).toLocaleString()} miles
                    </span>
                  </div>
                  
                  <div className="bg-white rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-yellow-400 h-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min((Number(getFieldValue("odometerReading")) / 200000) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Brand New</span>
                    <span>Well Traveled</span>
                  </div>
                  
                  <div className="text-center text-sm text-gray-600">
                    {Number(getFieldValue("odometerReading")) < 30000 && "🌟 Low mileage gem!"}
                    {Number(getFieldValue("odometerReading")) >= 30000 && Number(getFieldValue("odometerReading")) < 100000 && "👍 Great condition range"}
                    {Number(getFieldValue("odometerReading")) >= 100000 && "🚗 Experienced traveler"}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "title-condition":
        return (
          <div className="space-y-4">
            <Select
              value={getFieldValue("titleCondition")}
              onValueChange={(value) => updateField("titleCondition", value)}
            >
              <SelectTrigger className="text-lg p-4 h-14">
                <SelectValue placeholder="Select title condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">Clean Title</SelectItem>
                <SelectItem value="salvage">Salvage</SelectItem>
                <SelectItem value="rebuilt">Rebuilt</SelectItem>
                <SelectItem value="lien">Lien</SelectItem>
                <SelectItem value="no-title">No Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "title-in-hand":
        return (
          <div className="space-y-4">
            <Select
              value={getFieldValue("titleInHand")}
              onValueChange={(value) => updateField("titleInHand", value)}
            >
              <SelectTrigger className="text-lg p-4 h-14">
                <SelectValue placeholder="Select title availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes, I have the title and can sign</SelectItem>
                <SelectItem value="no">No, I don't have the title in-hand</SelectItem>
                <SelectItem value="in-mail">Title is in the mail</SelectItem>
                <SelectItem value="lost">Title is lost/misplaced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "vehicle-condition":
        return (
          <div className="space-y-4">
            <Select
              value={getFieldValue("vehicleCondition")}
              onValueChange={(value) => updateField("vehicleCondition", value)}
            >
              <SelectTrigger className="text-lg p-4 h-14">
                <SelectValue placeholder="Select vehicle condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="junk">Junk/Non-running</SelectItem>
              </SelectContent>
            </Select>

            {/* Gamification: Condition Stars Visualization */}
            {getFieldValue("vehicleCondition") && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 text-center">
                <div className="mb-4">
                  {getFieldValue("vehicleCondition") === "excellent" && (
                    <>
                      <div className="text-4xl mb-2">⭐⭐⭐⭐⭐</div>
                      <h3 className="font-bold text-green-600">Premium Vehicle!</h3>
                      <p className="text-sm text-gray-600">Your car is in amazing shape - expect top dollar!</p>
                    </>
                  )}
                  {getFieldValue("vehicleCondition") === "good" && (
                    <>
                      <div className="text-4xl mb-2">⭐⭐⭐⭐</div>
                      <h3 className="font-bold text-blue-600">Great Condition!</h3>
                      <p className="text-sm text-gray-600">Well maintained vehicles get excellent offers!</p>
                    </>
                  )}
                  {getFieldValue("vehicleCondition") === "fair" && (
                    <>
                      <div className="text-4xl mb-2">⭐⭐⭐</div>
                      <h3 className="font-bold text-yellow-600">Good Value!</h3>
                      <p className="text-sm text-gray-600">Fair condition vehicles still have great value!</p>
                    </>
                  )}
                  {getFieldValue("vehicleCondition") === "poor" && (
                    <>
                      <div className="text-4xl mb-2">⭐⭐</div>
                      <h3 className="font-bold text-orange-600">Fixer Upper!</h3>
                      <p className="text-sm text-gray-600">We buy cars in any condition - still valuable!</p>
                    </>
                  )}
                  {getFieldValue("vehicleCondition") === "junk" && (
                    <>
                      <div className="text-4xl mb-2">🔧</div>
                      <h3 className="font-bold text-gray-600">For Parts!</h3>
                      <p className="text-sm text-gray-600">Even non-running cars have value for parts!</p>
                    </>
                  )}
                </div>
                
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Honesty Bonus</p>
                  <div className="text-green-600 font-bold">+$50 Fair Assessment</div>
                  <p className="text-xs text-gray-400">Accurate descriptions get better offers</p>
                </div>
              </div>
            )}
          </div>
        );

      case "damage":
        return (
          <div className="space-y-4">
            <Select
              value={getFieldValue("hasDamage")}
              onValueChange={(value) => updateField("hasDamage", value)}
            >
              <SelectTrigger className="text-lg p-4 h-14">
                <SelectValue placeholder="Select damage status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No damage</SelectItem>
                <SelectItem value="minor">Minor damage (small dents, scratches)</SelectItem>
                <SelectItem value="moderate">Moderate damage (larger dents, body damage)</SelectItem>
                <SelectItem value="major">Major damage (accident damage, structural issues)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "airbag":
        return (
          <div className="space-y-4">
            <Select
              value={getFieldValue("airbagDeployed")}
              onValueChange={(value) => updateField("airbagDeployed", value)}
            >
              <SelectTrigger className="text-lg p-4 h-14">
                <SelectValue placeholder="Select airbag status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No airbags deployed</SelectItem>
                <SelectItem value="yes">Yes, airbags deployed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "owner-info":
        return (
          <div className="space-y-4">
            <Input
              value={getFieldValue("ownerName")}
              onChange={(e) => updateField("ownerName", e.target.value)}
              placeholder="Enter your full name"
              className="text-lg p-4 h-14"
            />

            {/* Gamification: Trust Building */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-semibold text-gray-800 mb-2">Building Trust</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your information helps us personalize your cash offer
              </p>
              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Secure & Confidential</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "email":
        return (
          <div className="space-y-4">
            <Input
              value={getFieldValue("email")}
              onChange={(e) => updateField("email", e.target.value)}
              type="email"
              placeholder="Enter your email address"
              className="text-lg p-4 h-14"
            />
          </div>
        );

      case "phone":
        return (
          <div className="space-y-4">
            <Input
              value={getFieldValue("phoneNumber")}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
              type="tel"
              placeholder="Enter your phone number"
              className="text-lg p-4 h-14"
            />
          </div>
        );

      case "location":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                onClick={detectLocation}
                disabled={isDetectingLocation}
                className="mb-6"
              >
                {isDetectingLocation ? "Detecting..." : locationDetected ? "📍 Re-detect location" : "📍 Allow location access"}
              </Button>
              {locationDetected && !getFieldValue("street") && (
                <p className="text-sm text-amber-600 mb-4">
                  Location coordinates detected, but address lookup failed. Please fill in your address manually below.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Input
                value={getFieldValue("street")}
                onChange={(e) => updateField("street", e.target.value)}
                placeholder="Street address"
                className="text-lg p-4 h-14"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={getFieldValue("city")}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="City"
                  className="text-lg p-4 h-14"
                />

                <Input
                  value={getFieldValue("state")}
                  onChange={(e) => updateField("state", e.target.value)}
                  placeholder="State"
                  className="text-lg p-4 h-14"
                />
              </div>

              <Input
                value={getFieldValue("zip")}
                onChange={(e) => updateField("zip", e.target.value)}
                placeholder="ZIP code"
                className="text-lg p-4 h-14"
              />
            </div>
          </div>
        );

      case "photos":
        return (
          <div className="space-y-6">
            <ObjectUploader
              photos={uploadedPhotos}
              onPhotosChange={setUploadedPhotos}
            />
            {uploadedPhotos.length === 0 && (
              <p className="text-sm text-red-500 text-center">
                Please upload at least one photo to continue
              </p>
            )}

            {/* Gamification: Photo Achievement System */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">📸</div>
                <h3 className="font-semibold text-gray-800">Photo Power-Up</h3>
                <p className="text-sm text-gray-600">More photos = Better offers!</p>
              </div>

              <div className="space-y-3">
                {/* Photo Achievement Badges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border-2 transition-all ${uploadedPhotos.length >= 1 ? 'bg-green-100 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-center">
                      <div className="text-2xl mb-1">{uploadedPhotos.length >= 1 ? '✅' : '📱'}</div>
                      <p className="text-xs font-medium">First Photo</p>
                      <p className="text-xs text-gray-500">+$25 bonus</p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border-2 transition-all ${uploadedPhotos.length >= 3 ? 'bg-green-100 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-center">
                      <div className="text-2xl mb-1">{uploadedPhotos.length >= 3 ? '✅' : '🚗'}</div>
                      <p className="text-xs font-medium">Complete Set</p>
                      <p className="text-xs text-gray-500">+$50 bonus</p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border-2 transition-all ${uploadedPhotos.length >= 5 ? 'bg-green-100 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-center">
                      <div className="text-2xl mb-1">{uploadedPhotos.length >= 5 ? '✅' : '⭐'}</div>
                      <p className="text-xs font-medium">Detail Master</p>
                      <p className="text-xs text-gray-500">+$75 bonus</p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border-2 transition-all ${uploadedPhotos.length >= 8 ? 'bg-green-100 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-center">
                      <div className="text-2xl mb-1">{uploadedPhotos.length >= 8 ? '✅' : '🏆'}</div>
                      <p className="text-xs font-medium">Pro Seller</p>
                      <p className="text-xs text-gray-500">+$100 bonus</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-gray-800">
                    Photo Bonus: <span className="text-green-600 font-bold">
                      +${uploadedPhotos.length >= 8 ? 250 : uploadedPhotos.length >= 5 ? 150 : uploadedPhotos.length >= 3 ? 75 : uploadedPhotos.length >= 1 ? 25 : 0}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {uploadedPhotos.length}/8 photos uploaded
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            {/* Gamification: Completion Achievement */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 text-center mb-6">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Almost There!</h3>
              <p className="text-green-600">You've completed all the steps - time for your reward!</p>
              
              <div className="bg-white rounded-lg p-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl mb-1">✅</div>
                    <p className="text-xs text-gray-600">Vehicle Info</p>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">✅</div>
                    <p className="text-xs text-gray-600">Photos</p>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">✅</div>
                    <p className="text-xs text-gray-600">Contact</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">VIN</label>
                <p className="text-lg">{getFieldValue("vin")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Vehicle</label>
                <p className="text-lg">{getFieldValue("vehicleYear")} {getFieldValue("vehicleMake")} {getFieldValue("vehicleModel")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Mileage</label>
                <p className="text-lg">{Number(getFieldValue("odometerReading")).toLocaleString()} miles</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Condition</label>
                <p className="text-lg capitalize">{getFieldValue("vehicleCondition")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Photos</label>
                <p className="text-lg">{uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} uploaded</p>
              </div>
            </div>

            <Button
              onClick={onSubmit}
              disabled={submitMutation.isPending}
              className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="lg"
            >
              {submitMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Getting Your Offer...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>🚀 Get My Cash Offer</span>
                </div>
              )}
            </Button>
          </div>
        );

      case "success":
        if (offerAccepted) {
          return (
            <div className="text-center py-8 space-y-6">
              <div className="text-6xl mb-6">🚚</div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-green-600">Offer Accepted!</h2>
                <p className="text-gray-600">
                  Great! We'll arrange pickup and payment for your vehicle.
                </p>

                <div className="bg-green-50 rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-green-900">Next Steps</h3>

                  <div className="text-left space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-medium text-green-900">Driver Pickup Scheduled</p>
                        <p className="text-sm text-green-700">Within 24-48 hours at your location</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-medium text-green-900">Vehicle Inspection</p>
                        <p className="text-sm text-green-700">Quick on-site inspection to confirm condition</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-medium text-green-900">Instant Payment</p>
                        <p className="text-sm text-green-700">Cash payment on the spot</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <p className="font-medium text-green-900">Title Transfer</p>
                        <p className="text-sm text-green-700">We handle all paperwork for you</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">What to Have Ready:</h4>
                  <ul className="text-sm text-blue-700 text-left space-y-1">
                    <li>• Vehicle title (signed and ready)</li>
                    <li>• Valid ID matching title</li>
                    <li>• Keys and any remotes</li>
                    <li>• Registration (if available)</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    📞 You'll receive a call within 2 hours to schedule pickup
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => submissionId && setLocation(`/view/${submissionId}`)}
                  className="w-full h-12"
                  disabled={!submissionId}
                >
                  View Submission Details
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="w-full h-12"
                >
                  Submit Another Vehicle
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl mb-6">💰</div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Your Cash Offer</h2>

              {submissionId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Submission ID:</p>
                  <p className="font-mono text-lg">{submissionId}</p>
                </div>
              )}

              {/* Cash Offer */}
              {isLoadingPrice ? (
                <div className="bg-blue-50 rounded-lg p-8">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-blue-700 text-lg">Calculating your offer...</span>
                  </div>
                </div>
              ) : estimatedPrice && timeLeft > 0 ? (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 space-y-4">
                  <div className="space-y-2">
                    <p className="text-lg text-gray-700">We'll pay you</p>
                    <div className="text-5xl font-bold text-green-600">
                      ${estimatedPrice.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600">Cash on pickup</p>
                  </div>

                  <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                    <p className="text-red-800 font-medium">⏰ Limited Time Offer</p>
                    <p className="text-red-700 text-lg font-mono">{formatTime(timeLeft)}</p>
                    <p className="text-red-600 text-sm">Accept now to lock in this price</p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleAcceptOffer}
                      className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      Accept Offer - ${estimatedPrice.toLocaleString()}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => window.location.href = "/"}
                      className="w-full h-12"
                    >
                      Decline Offer
                    </Button>
                  </div>
                </div>
              ) : estimatedPrice && timeLeft <= 0 ? (
                <div className="bg-gray-100 rounded-lg p-8">
                  <p className="text-gray-600 text-lg">Offer expired</p>
                  <p className="text-gray-500 text-sm mt-2">Please submit a new request for a fresh quote</p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = "/"}
                    className="w-full h-12 mt-4"
                  >
                    Get New Quote
                  </Button>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8">
                  <p className="text-gray-600">
                    We're reviewing your vehicle and will contact you with an offer.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Check your email within 24 hours for our response.
                  </p>
                </div>
              )}
            </div>

            {!offerAccepted && (
              <div className="space-y-3">
                <Button
                  onClick={() => submissionId && setLocation(`/view/${submissionId}`)}
                  className="w-full h-12"
                  disabled={!submissionId}
                  variant="outline"
                >
                  View Submission Details
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = STEPS[currentStep];
  const progress = ((currentStep) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto p-4">
        {/* Progress bar */}
        {currentStep > 0 && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center">
              <span className="text-sm text-gray-500">
                Step {currentStep} of {STEPS.length - 1}
              </span>
            </div>
          </div>
        )}

        <Card className="border-none shadow-lg">
          <CardContent className="p-8">
            <div className="min-h-[400px]">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentStepData.title}
                </h1>
                {currentStepData.subtitle && (
                  <p className="text-gray-600 text-lg">
                    {currentStepData.subtitle}
                  </p>
                )}
              </div>

              {/* Step content */}
              <div className="mb-8">
                {renderStepContent()}
              </div>
            </div>

            {/* Navigation */}
            {currentStep > 0 && currentStep < STEPS.length - 1 && (
              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                {currentStep < STEPS.length - 2 && (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
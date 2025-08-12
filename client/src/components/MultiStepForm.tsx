import { useState } from "react";
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
import { ObjectUploader } from "@/components/ObjectUploader";
import { VinScanner } from "@/components/VinScanner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight } from "lucide-react";

const submissionSchema = z.object({
  vin: z.string().min(17, "VIN must be 17 characters"),
  ownerName: z.string().min(1, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(10, "Phone number is required"),
  titleCondition: z.string().min(1, "Title condition is required"),
  vehicleCondition: z.string().min(1, "Vehicle condition is required"),
  odometerReading: z.string().min(1, "Odometer reading is required"),
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
    id: "vehicle-condition",
    title: "What's your vehicle's condition?",
    subtitle: "Be honest - this helps us give you the best offer",
    fields: ["vehicleCondition"],
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

  // Simple form with direct state management
  const [formData, setFormData] = useState<Partial<SubmissionForm>>({});

  const form = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      vin: "",
      ownerName: "",
      email: "",
      phoneNumber: "",
      titleCondition: "",
      vehicleCondition: "",
      odometerReading: "",
      latitude: "",
      longitude: "",
      address: "",
      street: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const updateField = (field: keyof SubmissionForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    form.setValue(field, value);
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

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      updateField("latitude", latitude.toString());
      updateField("longitude", longitude.toString());

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );

        if (response.ok) {
          const data = await response.json();
          const address = data.address || {};

          updateField("address", data.display_name || "");
          updateField("street", `${address.house_number || ""} ${address.road || ""}`.trim());
          updateField("city", address.city || address.town || address.village || "");
          updateField("state", address.state || "");
          updateField("zip", address.postcode || "");
        }
      } catch (geocodeError) {
        console.log("Reverse geocoding failed, but location coordinates were set:", geocodeError);
      }

      setLocationDetected(true);
      toast({
        title: "Location detected",
        description: "Your location has been automatically detected.",
      });

    } catch (error: any) {
      console.error("Geolocation error:", error);
      let message = "Please enter your location manually.";

      if (error.code === 1) {
        message = "Location access was denied. Please enable location services and try again.";
      } else if (error.code === 2) {
        message = "Location unavailable. Please enter your location manually.";
      } else if (error.code === 3) {
        message = "Location request timed out. Please try again or enter manually.";
      }

      toast({
        title: "Location detection failed",
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
      const response = await apiRequest("POST", "/api/submissions", submissionData);
      const result = await response.json();

      // Then submit photos if any
      if (photos.length > 0) {
        await apiRequest("POST", `/api/submissions/${result.submissionId}/photos`, {
          photoUrls: photos
        });
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Submission successful!",
        description: "Your vehicle information has been submitted.",
      });
      setLocation(`/view/${data.submissionId}`);
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

    if (currentStep === 9) { // Photos step
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
      ownerName: getFieldValue("ownerName"),
      email: getFieldValue("email"),
      phoneNumber: getFieldValue("phoneNumber"),
      titleCondition: getFieldValue("titleCondition"),
      vehicleCondition: getFieldValue("vehicleCondition"),
      odometerReading: getFieldValue("odometerReading"),
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

            {showVinScanner && (
              <VinScanner
                onVinDetected={(vin) => {
                  updateField("vin", vin);
                  setShowVinScanner(false);
                }}
                onClose={() => setShowVinScanner(false)}
              />
            )}
          </div>
        );

      case "odometer":
        return (
          <div className="space-y-6">
            <Input
              value={getFieldValue("odometerReading")}
              onChange={(e) => updateField("odometerReading", e.target.value)}
              type="number"
              placeholder="Enter mileage"
              className="text-lg p-4 h-14"
            />
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
                {isDetectingLocation ? "Detecting..." : "📍 Auto-detect my location"}
              </Button>
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
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">VIN</label>
                <p className="text-lg">{getFieldValue("vin")}</p>
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
              className="w-full h-14 text-lg"
              size="lg"
            >
              {submitMutation.isPending ? "Getting Your Offer..." : "Get My Cash Offer"}
            </Button>
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
            {currentStep > 0 && (
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

                {currentStep < STEPS.length - 1 && (
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
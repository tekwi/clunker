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
import { OdometerInput } from "@/components/OdometerInput";
import { VinScanner } from "@/components/VinScanner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight } from "lucide-react";

const submissionSchema = z.object({
  vin: z.string().min(17, "VIN must be 17 characters"),
  ownerName: z.string().min(1, "Owner name is required"),
  email: z.string().email("Valid email is required"),
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
  component: React.ReactNode;
  validation?: (keyof SubmissionForm)[];
}

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [showOdometerInput, setShowOdometerInput] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));


  const form = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      vin: "",
      ownerName: "",
      email: "",
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
      form.setValue("latitude", latitude.toString());
      form.setValue("longitude", longitude.toString());

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );

        if (response.ok) {
          const data = await response.json();
          const address = data.address || {};

          form.setValue("address", data.display_name || "");
          form.setValue("street", `${address.house_number || ""} ${address.road || ""}`.trim());
          form.setValue("city", address.city || address.town || address.village || "");
          form.setValue("state", address.state || "");
          form.setValue("zip", address.postcode || "");
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
      const response = await apiRequest("POST", "/api/submissions", data);
      return response.json();
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

  const steps: Step[] = [
    {
      id: "welcome",
      title: "Get Cash for Your Car",
      subtitle: "Submit your vehicle details and get an instant cash offer",
      component: (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🚗</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
          <p className="text-gray-600 mb-8">We'll walk you through a few quick questions to get you the best cash offer for your vehicle.</p>
          <Button onClick={() => setCurrentStep(1)} size="lg" className="w-full max-w-sm">
            Let's Begin
          </Button>
        </div>
      ),
    },
    {
      id: "vin",
      title: "What's your VIN number?",
      subtitle: "You can find this on your dashboard or driver's side door",
      validation: ["vin"],
      component: (
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter 17-character VIN"
                      className="text-lg p-4 h-14"
                      maxLength={17}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVinScanner(true)}
                    className="h-14 px-6"
                  >
                    Scan
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {showVinScanner && (
            <VinScanner
              onVinDetected={(vin) => {
                form.setValue("vin", vin);
                setShowVinScanner(false);
              }}
              onClose={() => setShowVinScanner(false)}
            />
          )}
        </div>
      ),
    },
    {
      id: "odometer",
      title: "What's your current mileage?",
      subtitle: "Enter the odometer reading from your dashboard",
      validation: ["odometerReading"],
      component: (
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="odometerReading"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-4">
                  {!showOdometerInput ? (
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Enter mileage"
                          className="text-lg p-4 h-14"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowOdometerInput(true)}
                        className="h-14 px-6"
                      >
                        Camera
                      </Button>
                    </div>
                  ) : (
                    <OdometerInput
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setShowOdometerInput(false);
                      }}
                      onClose={() => setShowOdometerInput(false)}
                    />
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      id: "title-condition",
      title: "What's your title condition?",
      subtitle: "This affects the value of your vehicle",
      validation: ["titleCondition"],
      component: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="titleCondition"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-lg p-4 h-14">
                      <SelectValue placeholder="Select title condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="clean">Clean Title</SelectItem>
                    <SelectItem value="salvage">Salvage</SelectItem>
                    <SelectItem value="rebuilt">Rebuilt</SelectItem>
                    <SelectItem value="lien">Lien</SelectItem>
                    <SelectItem value="no-title">No Title</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      id: "vehicle-condition",
      title: "What's your vehicle's condition?",
      subtitle: "Be honest - this helps us give you the best offer",
      validation: ["vehicleCondition"],
      component: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="vehicleCondition"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-lg p-4 h-14">
                      <SelectValue placeholder="Select vehicle condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="junk">Junk/Non-running</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      id: "owner-info",
      title: "What's your name?",
      subtitle: "We'll use this for your cash offer",
      validation: ["ownerName"],
      component: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="ownerName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your full name"
                    className="text-lg p-4 h-14"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      id: "email",
      title: "What's your email?",
      subtitle: "We'll send your cash offer here",
      validation: ["email"],
      component: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter your email address"
                    className="text-lg p-4 h-14"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      id: "location",
      title: "Where is your vehicle located?",
      subtitle: "This helps us arrange pickup if you accept our offer",
      component: (
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
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Street address"
                      className="text-lg p-4 h-14"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="City"
                        className="text-lg p-4 h-14"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="State"
                        className="text-lg p-4 h-14"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="zip"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ZIP code"
                      className="text-lg p-4 h-14"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ),
    },
    {
      id: "photos",
      title: "Add some photos",
      subtitle: "Take pictures of your vehicle's exterior, interior, and any damage",
      component: (
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
      ),
    },
    {
      id: "review",
      title: "Ready to get your offer?",
      subtitle: "Review your information and submit",
      component: (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">VIN</label>
              <p className="text-lg">{form.getValues("vin")}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Mileage</label>
              <p className="text-lg">{Number(form.getValues("odometerReading")).toLocaleString()} miles</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Condition</label>
              <p className="text-lg capitalize">{form.getValues("vehicleCondition")}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Photos</label>
              <p className="text-lg">{uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} uploaded</p>
            </div>
          </div>

          <Button
            onClick={() => onSubmit(form.getValues())}
            disabled={submitMutation.isPending}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {submitMutation.isPending ? "Getting Your Offer..." : "Get My Cash Offer"}
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = (data: SubmissionForm) => {
    if (uploadedPhotos.length === 0) {
      toast({
        title: "Photos required",
        description: "Please upload at least one photo of your vehicle.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      ...data,
      photos: uploadedPhotos,
    });
  };

  const validateCurrentStep = async () => {
    const step = steps[currentStep];
    if (!step.validation) return true;

    const result = await form.trigger(step.validation);
    return result;
  };

  const nextStep = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      setVisitedSteps(prev => new Set([...prev, 1]));
      return;
    }

    if (currentStep === steps.length - 2) { // Photos step
      if (uploadedPhotos.length === 0) {
        toast({
          title: "Photos required",
          description: "Please upload at least one photo to continue.",
          variant: "destructive",
        });
        return;
      }
    }

    const isValid = await validateCurrentStep();
    if (isValid && currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      
      // Only clear the next step's input fields if user hasn't visited it before
      if (!visitedSteps.has(nextStepIndex)) {
        const nextStepData = steps[nextStepIndex];
        if (nextStepData.validation) {
          nextStepData.validation.forEach(field => {
            form.setValue(field, "", { shouldValidate: false, shouldDirty: false, shouldTouch: false });
            form.clearErrors(field);
          });
        }
      }

      setCurrentStep(nextStepIndex);
      setVisitedSteps(prev => new Set([...prev, nextStepIndex]));
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto p-4">
        {/* Progress bar */}
        {currentStep > 0 && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center">
              <span className="text-sm text-gray-500">
                Step {currentStep} of {steps.length - 1}
              </span>
            </div>
          </div>
        )}

        <Card className="border-none shadow-lg">
          <CardContent className="p-8">
            <Form {...form}>
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
                  {currentStepData.component}
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

                  {currentStep < steps.length - 1 && (
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
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
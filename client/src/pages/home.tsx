
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ObjectUploader } from "@/components/ObjectUploader";
import { OdometerInput } from "@/components/OdometerInput";
import { VinScanner } from "@/components/VinScanner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

export default function Home() {
  const [, setLocation] = useLocation();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [locationDetected, setLocationDetected] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [showOdometerInput, setShowOdometerInput] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            form.setValue("latitude", latitude.toString());
            form.setValue("longitude", longitude.toString());
            
            // Reverse geocoding to get address
            try {
              const response = await fetch(
                `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=demo_key`
              );
              const data = await response.json();
              if (data.results && data.results[0]) {
                const components = data.results[0].components;
                form.setValue("address", data.results[0].formatted || "");
                form.setValue("street", `${components.house_number || ""} ${components.road || ""}`.trim());
                form.setValue("city", components.city || components.town || "");
                form.setValue("state", components.state || "");
                form.setValue("zip", components.postcode || "");
              }
            } catch (error) {
              console.log("Reverse geocoding failed:", error);
            }
            
            setLocationDetected(true);
            setIsDetectingLocation(false);
            toast({
              title: "Location detected",
              description: "Your location has been automatically filled in.",
            });
          },
          (error) => {
            console.error("Geolocation error:", error);
            setIsDetectingLocation(false);
            toast({
              title: "Location access denied",
              description: "Please enter your location manually.",
              variant: "destructive",
            });
          }
        );
      }
    } catch (error) {
      setIsDetectingLocation(false);
      toast({
        title: "Location detection failed",
        description: "Please enter your location manually.",
        variant: "destructive",
      });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: SubmissionForm & { photos: string[] }) => {
      return apiRequest("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Submission successful!",
        description: "Your vehicle information has been submitted.",
      });
      setLocation(`/submission/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Get Cash for Your Car
          </h1>
          <p className="text-gray-600">
            Submit your vehicle details and get an instant cash offer
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* VIN Section */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-800">Vehicle Information</h2>
                  
                  <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          VIN Number <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter 17-character VIN"
                              className="flex-1"
                              maxLength={17}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowVinScanner(true)}
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

                {/* Odometer Section */}
                <FormField
                  control={form.control}
                  name="odometerReading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Odometer Reading <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="space-y-2">
                        {!showOdometerInput ? (
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="Enter mileage"
                                className="flex-1"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowOdometerInput(true)}
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

                {/* Vehicle Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="titleCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Title Condition <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
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

                  <FormField
                    control={form.control}
                    name="vehicleCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Vehicle Condition <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
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

                {/* Owner Information */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-800">Contact Information</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Full Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter your full name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Email Address <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Location</h2>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                    >
                      {isDetectingLocation ? "Detecting..." : "Auto-detect"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Street address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City" />
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
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="State" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ZIP code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Photos */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-800">Vehicle Photos</h2>
                  <p className="text-sm text-gray-600">
                    Take or upload photos of your vehicle (exterior, interior, any damage)
                  </p>
                  <ObjectUploader
                    photos={uploadedPhotos}
                    onPhotosChange={setUploadedPhotos}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit for Cash Offer"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

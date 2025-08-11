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
import type { UploadResult } from "@uppy/core";

const submissionSchema = z.object({
  vin: z.string().min(17, "VIN must be 17 characters").max(17, "VIN must be 17 characters"),
  ownerName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  titleCondition: z.string().min(1, "Please select title condition"),
  vehicleCondition: z.string().optional(),
  odometerReading: z.string().optional(),
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

  const submitMutation = useMutation({
    mutationFn: async (data: SubmissionForm) => {
      // First create the submission
      const response = await apiRequest("POST", "/api/submit", {
        vin: data.vin,
        ownerName: data.ownerName,
        email: data.email,
        titleCondition: data.titleCondition,
        vehicleCondition: data.vehicleCondition || null,
        odometerReading: data.odometerReading || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        address: data.address || 
          (data.street || data.city || data.state || data.zip ? 
            `${data.street || ''} ${data.city || ''} ${data.state || ''} ${data.zip || ''}`.trim() : 
            null),
      });
      
      const result = await response.json();
      const submissionId = result.submissionId;
      
      // Then add photos if any
      if (uploadedPhotos.length > 0) {
        await apiRequest("POST", `/api/submissions/${submissionId}/photos`, {
          photoUrls: uploadedPhotos,
        });
      }
      
      return { submissionId };
    },
    onSuccess: (data) => {
      toast({
        title: "Submission Successful!",
        description: "We've received your vehicle information. You'll receive an email with a unique link to track your submission.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/view", data.submissionId] });
      setLocation(`/view/${data.submissionId}`);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "An error occurred while submitting your vehicle information.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful) {
      const newUrls = result.successful.map(file => file.uploadURL).filter((url): url is string => Boolean(url));
      setUploadedPhotos(prev => [...prev, ...newUrls]);
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location detection.",
        variant: "destructive",
      });
      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("latitude", latitude.toString());
        form.setValue("longitude", longitude.toString());
        
        // Reverse geocode to get address (simplified implementation)
        form.setValue("address", `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setLocationDetected(true);
        setIsDetectingLocation(false);
        
        toast({
          title: "Location Detected",
          description: "Your current location has been captured.",
        });
      },
      (error) => {
        setIsDetectingLocation(false);
        toast({
          title: "Location Detection Failed", 
          description: "Please enter your address manually.",
          variant: "destructive",
        });
      }
    );
  };

  const onSubmit = (data: SubmissionForm) => {
    if (uploadedPhotos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one photo of your vehicle.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.latitude && !data.address && !data.street) {
      toast({
        title: "Location Required", 
        description: "Please either detect your location or enter an address manually.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-primary-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fas fa-car text-2xl"></i>
              <h1 className="text-xl font-semibold">Car Cash Offer</h1>
            </div>
            <div className="hidden sm:block">
              <span className="text-sm opacity-90">Get instant cash offers for your car</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        <Card className="shadow-sm border border-gray-200 dark:border-gray-800">
          {/* Form Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Submit Your Vehicle</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Fill out the details below to receive a cash offer for your car</p>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>Vehicle Info</span>
                <span>Photos</span>
                <span>Location</span>
                <span>Review</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: "25%" }}></div>
              </div>
            </div>
          </div>

          <CardContent className="px-6 py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="car-submission-form">
                {/* Vehicle Information Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <i className="fas fa-car text-primary mr-2"></i>
                    Vehicle Information
                  </h3>
                  
                  {/* VIN Input */}
                  <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          VIN Number <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="Enter 17-digit VIN number"
                              maxLength={17}
                              className="pr-12"
                              data-testid="input-vin"
                            />
                            <VinScanner 
                              onVinDetected={(vin) => {
                                form.setValue('vin', vin);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Tap camera icon to scan VIN with your phone
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Owner Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Full Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter your full name"
                              data-testid="input-owner-name"
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
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email Address <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="your@email.com"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Title & Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="titleCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Title Condition <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-title-condition">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Clean">Clean</SelectItem>
                              <SelectItem value="Salvage">Salvage</SelectItem>
                              <SelectItem value="Rebuilt">Rebuilt</SelectItem>
                              <SelectItem value="Missing">Missing</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
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
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Vehicle Condition
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-vehicle-condition">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Excellent">Excellent</SelectItem>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Fair">Fair</SelectItem>
                              <SelectItem value="Poor">Poor</SelectItem>
                              <SelectItem value="Not Running">Not Running</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Odometer Reading */}
                  <FormField
                    control={form.control}
                    name="odometerReading"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Odometer Reading (Miles)
                        </FormLabel>
                        <FormControl>
                          <OdometerInput
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Enter current mileage"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the current mileage or use the camera to scan your odometer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Photos Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <i className="fas fa-camera text-primary mr-2"></i>
                    Vehicle Photos <span className="text-red-500">*</span>
                  </h3>
                  
                  {/* Photo Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Vehicle Photos</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add multiple photos of your vehicle. Include exterior, interior, and any damage.</p>
                    
                    <ObjectUploader
                      maxNumberOfFiles={10}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      data-testid="button-upload-photos"
                    >
                      <i className="fas fa-camera mr-2"></i>
                      Take/Choose Photos
                    </ObjectUploader>
                  </div>

                  {/* Photo Preview Grid */}
                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" data-testid="photos-preview-grid">
                      {uploadedPhotos.map((photoUrl, index) => (
                        <div key={index} className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-square">
                          <img 
                            src={photoUrl}
                            alt={`Uploaded vehicle photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            ×
                          </Button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1">
                            Photo {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <i className="fas fa-map-marker-alt text-primary mr-2"></i>
                    Vehicle Location <span className="text-red-500">*</span>
                  </h3>
                  
                  {/* GPS Location Button */}
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-location-arrow text-primary"></i>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Use Current Location</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">We'll automatically detect your location</p>
                        </div>
                      </div>
                      <Button 
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isDetectingLocation}
                        className="bg-primary text-white hover:bg-primary/90"
                        data-testid="button-get-location"
                      >
                        {isDetectingLocation ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-1"></i>
                            Detecting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-crosshairs mr-1"></i>
                            Get Location
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Location Status */}
                    {locationDetected && (
                      <div className="mt-3 text-sm text-secondary-600 dark:text-secondary-400" data-testid="location-status">
                        <i className="fas fa-check-circle mr-1"></i>
                        Location detected: {form.getValues("address")}
                      </div>
                    )}
                  </div>

                  {/* Manual Address Entry */}
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Or enter address manually:</p>
                    
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Street Address"
                              data-testid="input-street"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="City"
                                data-testid="input-city"
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
                                data-testid="input-state"
                              />
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
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="ZIP Code"
                                data-testid="input-zip"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    className="w-full bg-accent text-accent-foreground py-4 px-6 text-lg font-semibold hover:bg-accent/90 transform hover:scale-[1.02] transition-all shadow-lg"
                    data-testid="button-submit-offer"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane mr-2"></i>
                        Submit for Cash Offer
                      </>
                    )}
                  </Button>
                  <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                    By submitting, you agree to receive communications about your vehicle offer
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <i className="fas fa-car text-xl"></i>
              <span className="text-lg font-semibold">Car Cash Offer</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Get instant cash offers for your unwanted vehicles</p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
              © 2024 Car Cash Offer. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

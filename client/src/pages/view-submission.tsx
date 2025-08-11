import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubmissionWithRelations } from "@shared/schema";

const offerSchema = z.object({
  offerPrice: z.string().min(1, "Offer price is required"),
  notes: z.string().optional(),
});

type OfferForm = z.infer<typeof offerSchema>;

export default function ViewSubmission() {
  const [, params] = useRoute("/view/:submissionId");
  const submissionId = params?.submissionId;
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OfferForm>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      offerPrice: "",
      notes: "",
    },
  });

  const { data: submission, isLoading } = useQuery<SubmissionWithRelations>({
    queryKey: ["/api/view", submissionId],
    enabled: !!submissionId,
  });

  const offerMutation = useMutation({
    mutationFn: async (data: OfferForm) => {
      const response = await apiRequest("POST", `/api/offer/${submissionId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Offer Submitted Successfully!",
        description: "The customer will be notified via email about the offer.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/view", submissionId] });
      setIsAdminMode(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Submit Offer",
        description: error.message || "An error occurred while submitting the offer.",
        variant: "destructive",
      });
    },
  });

  const onSubmitOffer = (data: OfferForm) => {
    offerMutation.mutate(data);
  };

  if (!submissionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Invalid submission ID</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Submission Not Found</h1>
              <p className="text-gray-600">
                The submission you're looking for doesn't exist or may have been removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdminMode(!isAdminMode)}
                className="text-white border-white hover:bg-white hover:text-primary-700"
                data-testid="button-toggle-admin"
              >
                <i className="fas fa-user-shield mr-2"></i>
                {isAdminMode ? "Customer View" : "Admin Mode"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        {isAdminMode ? (
          /* Admin Offer Entry */
          <Card className="shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950">
              <div className="flex items-center">
                <i className="fas fa-user-shield text-red-600 mr-2"></i>
                <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">Admin Mode - Enter Cash Offer</h2>
              </div>
            </div>

            <CardContent className="px-6 py-6">
              {/* Quick Vehicle Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Vehicle Summary</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      VIN: <span className="font-mono">{submission.vin}</span> • 
                      Owner: <span>{submission.ownerName}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Condition: <span>{submission.titleCondition} Title</span>
                      {submission.vehicleCondition && <> • <span>{submission.vehicleCondition} Condition</span></>}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdminMode(false)}
                    className="text-primary hover:text-primary/80"
                    data-testid="button-view-details"
                  >
                    View Details
                  </Button>
                </div>
              </div>

              {/* Offer Entry Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitOffer)} className="space-y-6" data-testid="admin-offer-form">
                  <FormField
                    control={form.control}
                    name="offerPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Cash Offer Amount <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 text-lg">$</span>
                            </div>
                            <Input
                              {...field}
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              className="pl-8 text-lg"
                              data-testid="input-offer-amount"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Enter the cash offer amount in USD
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Offer Notes (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Additional notes about the offer, market conditions, or vehicle assessment..."
                            rows={4}
                            className="resize-none"
                            data-testid="textarea-offer-notes"
                          />
                        </FormControl>
                        <FormDescription>
                          These notes will be visible to the customer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-2"></i>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">Offer Process:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Customer will be notified via email</li>
                          <li>Offer is valid for 7 days</li>
                          <li>Customer can accept, reject, or counter offer</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      type="submit" 
                      disabled={offerMutation.isPending}
                      className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      data-testid="button-submit-offer"
                    >
                      {offerMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i>
                          Submit Cash Offer
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsAdminMode(false)}
                      data-testid="button-cancel-offer"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          /* Customer View */
          <Card className="shadow-sm border border-gray-200 dark:border-gray-800">
            {/* Header with Status */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Vehicle Submission</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Submission ID: <span className="font-mono" data-testid="text-submission-id">#{submission.id}</span>
                  </p>
                </div>
                <div className="mt-3 sm:mt-0">
                  <Badge variant={submission.offer ? "default" : "secondary"} data-testid="status-badge">
                    <i className={`mr-1 text-xs ${submission.offer ? "fas fa-dollar-sign" : "fas fa-clock"}`}></i>
                    {submission.offer ? "Offer Received" : "Pending Offer"}
                  </Badge>
                </div>
              </div>
            </div>

            <CardContent className="px-6 py-6">
              {/* Vehicle Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <i className="fas fa-info-circle text-primary mr-2"></i>
                      Vehicle Information
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3" data-testid="vehicle-info">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">VIN:</span>
                        <span className="text-sm font-mono text-gray-900 dark:text-gray-100">{submission.vin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Owner:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{submission.ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Title Condition:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{submission.titleCondition}</span>
                      </div>
                      {submission.vehicleCondition && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Vehicle Condition:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100">{submission.vehicleCondition}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Submitted:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Photos Gallery */}
                  {submission.pictures.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <i className="fas fa-images text-primary mr-2"></i>
                        Vehicle Photos
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="photos-gallery">
                        {submission.pictures.map((picture, index) => (
                          <div key={picture.id} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                            <img 
                              src={picture.url}
                              alt={`Vehicle photo ${index + 1}`}
                              className="w-full h-full object-cover"
                              data-testid={`img-vehicle-photo-${index}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Location & Offer Sidebar */}
                <div className="space-y-6">
                  {/* Location */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <i className="fas fa-map-marker-alt text-primary mr-2"></i>
                      Location
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      {submission.address ? (
                        <p className="text-sm text-gray-900 dark:text-gray-100 mb-3" data-testid="text-address">
                          {submission.address}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          Location not provided
                        </p>
                      )}
                      {/* Simple map placeholder */}
                      <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <i className="fas fa-map text-gray-400 text-2xl"></i>
                        <span className="ml-2 text-gray-500 text-sm">Map View</span>
                      </div>
                    </div>
                  </div>

                  {/* Offer Status */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <i className="fas fa-dollar-sign text-secondary mr-2"></i>
                      Cash Offer
                    </h3>
                    
                    {!submission.offer ? (
                      /* No Offer Yet */
                      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4" data-testid="no-offer-state">
                        <div className="flex items-center mb-2">
                          <i className="fas fa-clock text-yellow-600 mr-2"></i>
                          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Pending Review</span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Our team is reviewing your submission. You'll receive an offer via email within 24 hours.
                        </p>
                      </div>
                    ) : (
                      /* Offer Received */
                      <div className="bg-secondary-50 dark:bg-secondary-950 border border-secondary-200 dark:border-secondary-800 rounded-lg p-4" data-testid="offer-received-state">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-secondary-700 dark:text-secondary-400 mb-2">
                            $<span data-testid="text-offer-amount">{parseFloat(submission.offer.offerPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">Cash Offer</p>
                          <div className="space-y-2">
                            <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid="button-accept-offer">
                              Accept Offer
                            </Button>
                            <Button variant="outline" className="w-full" data-testid="button-counter-offer">
                              Counter Offer
                            </Button>
                          </div>
                        </div>
                        
                        {submission.offer.notes && (
                          <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                            <p className="text-xs text-secondary-600 dark:text-secondary-400">
                              <strong>Note:</strong> <span data-testid="text-offer-notes">{submission.offer.notes}</span>
                            </p>
                            <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                              Offer valid for 7 days
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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

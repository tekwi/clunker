import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubmissionWithRelations } from "@shared/schema";

const offerSchema = z.object({
  offerPrice: z.string().min(1, "Offer price is required"),
  notes: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type OfferForm = z.infer<typeof offerSchema>;
type LoginForm = z.infer<typeof loginSchema>;

export default function ViewSubmission() {
  const [, params] = useRoute("/view/:submissionId");
  const submissionId = params?.submissionId;
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OfferForm>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      offerPrice: "",
      notes: "",
    },
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const editForm = useForm<OfferForm>({
    resolver: zodResolver(offerSchema),
  });

  // Check authentication on load
  useEffect(() => {
    const storedSessionId = localStorage.getItem('admin_session');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      setIsAuthenticated(true);
    }
  }, []);

  const { data: submission, isLoading } = useQuery<SubmissionWithRelations>({
    queryKey: ["/api/view", submissionId],
    enabled: !!submissionId,
  });

  const { data: allOffers } = useQuery({
    queryKey: ["/api/admin/offers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/offers", {
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch offers');
      return response.json();
    },
    enabled: isAuthenticated && isAdminMode,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Invalid credentials");
      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setIsAuthenticated(true);
      setShowLoginDialog(false);
      localStorage.setItem('admin_session', data.sessionId);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.admin.username}!`,
      });
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid username or password.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
      });
    },
    onSuccess: () => {
      setSessionId(null);
      setIsAuthenticated(false);
      setIsAdminMode(false);
      localStorage.removeItem('admin_session');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
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

  const updateOfferMutation = useMutation({
    mutationFn: async ({ offerId, data }: { offerId: string; data: OfferForm }) => {
      const response = await fetch(`/api/admin/offers/${offerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update offer");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Offer Updated",
        description: "The offer has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/view", submissionId] });
      setEditingOffer(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update the offer.",
        variant: "destructive",
      });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await fetch(`/api/admin/offers/${offerId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete offer");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Offer Deleted",
        description: "The offer has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/view", submissionId] });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the offer.",
        variant: "destructive",
      });
    },
  });

  const handleAdminModeToggle = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
    } else {
      setIsAdminMode(!isAdminMode);
    }
  };

  const onSubmitLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onSubmitOffer = (data: OfferForm) => {
    offerMutation.mutate(data);
  };

  const onUpdateOffer = (data: OfferForm) => {
    if (editingOffer) {
      updateOfferMutation.mutate({ offerId: editingOffer.id, data });
    }
  };

  const startEditOffer = (offer: any) => {
    setEditingOffer(offer);
    editForm.setValue("offerPrice", offer.offerPrice);
    editForm.setValue("notes", offer.notes || "");
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
            <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
              <i className="fas fa-car text-2xl"></i>
              <h1 className="text-xl font-semibold">Car Cash Offer</h1>
            </a>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/'}
                  className="text-primary border-white hover:bg-white hover:text-primary-700"
                  data-testid="button-add-new-vehicle"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add New Vehicle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdminModeToggle}
                  className="text-primary border-white hover:bg-white hover:text-primary-700"
                  data-testid="button-toggle-admin"
                >
                  <i className="fas fa-user-shield mr-2"></i>
                  {isAdminMode ? "Customer View" : "Admin Mode"}
                </Button>
                {isAuthenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    className="text-primary border-white hover:bg-white hover:text-primary-700"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Logout
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        {isAdminMode ? (
          /* Admin Dashboard */
          <div className="space-y-6">
            {/* Quick Offer Entry for Current Submission */}
            {submissionId && (
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
            )}

            {/* All Offers Management Table */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-table mr-2"></i>
                  All Offers Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allOffers && allOffers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>VIN</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Offer Amount</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allOffers.map((offer: any) => (
                          <TableRow key={offer.id}>
                            <TableCell className="font-mono text-sm">
                              <button
                                onClick={() => window.open(`/view/${offer.submissionId}`, '_blank')}
                                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                                title="View submission details"
                              >
                                {offer.vin}
                              </button>
                            </TableCell>
                            <TableCell>{offer.ownerName}</TableCell>
                            <TableCell>{offer.email}</TableCell>
                            <TableCell>{offer.phoneNumber}</TableCell>
                            <TableCell className="font-bold text-green-600">
                              ${parseFloat(offer.offerPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {offer.notes || '-'}
                            </TableCell>
                            <TableCell>
                              {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditOffer(offer)}
                                >
                                  <i className="fas fa-edit mr-1"></i>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteOfferMutation.mutate(offer.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <i className="fas fa-trash mr-1"></i>
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-inbox text-4xl mb-4"></i>
                    <p>No offers found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                      {submission.odometerReading && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Odometer Reading:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100">{submission.odometerReading} miles</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Submitted:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'Unknown'}
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

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Login</DialogTitle>
          </DialogHeader>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onSubmitLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowLoginDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Dialog */}
      <Dialog open={!!editingOffer} onOpenChange={() => setEditingOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
          </DialogHeader>
          {editingOffer && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onUpdateOffer)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="offerPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">$</span>
                          </div>
                          <Input {...field} type="number" step="0.01" min="0" className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditingOffer(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateOfferMutation.isPending}>
                    {updateOfferMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Updating...
                      </>
                    ) : (
                      "Update Offer"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

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
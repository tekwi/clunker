
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Form, FormItem, FormLabel, FormControl, FormField } from "@/components/ui/form";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface AdminOffer {
  id: string;
  submissionId: string;
  vin: string;
  ownerName: string;
  email: string;
  phoneNumber: string;
  offerPrice: string;
  notes: string;
  status: string;
  acceptedAt: string;
  createdAt: string;
  titleCondition: string;
  vehicleCondition: string;
  odometerReading: string;
  address: string;
}

interface Submission {
  id: string;
  vin: string;
  ownerName: string;
  email: string;
  phoneNumber: string;
  titleCondition: string;
  vehicleCondition: string;
  odometerReading: string;
  address: string;
  affiliateCode: string;
  createdAt: string;
  pictures: Array<{ id: string; url: string; createdAt: string }>;
  offer?: {
    id: string;
    offerPrice: string;
    notes: string;
    status: string;
    createdAt: string;
  };
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  uniqueCode: string;
  commissionRate: string;
  isActive: string;
  createdAt: string;
}

interface AdminSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  settingType: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const affiliateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  commissionRate: z.string().min(1, "Commission rate is required"),
});

const ITEMS_PER_PAGE = 10;

export default function AdminDashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null);
  const [editForm, setEditForm] = useState({ offerPrice: "", notes: "" });
  const [activeTab, setActiveTab] = useState<"offers" | "submissions" | "affiliates" | "settings">("offers");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof affiliateFormSchema>>({
    resolver: zodResolver(affiliateFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      commissionRate: "",
    },
  });

  useEffect(() => {
    const savedSessionId = localStorage.getItem("adminSessionId");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      setIsAuthenticated(true);
    }
  }, []);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setStatusFilter(null);
  }, [activeTab]);

  const apiRequest = async (method: string, url: string, data?: any) => {
    const headers: any = { "Content-Type": "application/json" };
    const currentSessionId = sessionId || localStorage.getItem("adminSessionId");
    if (currentSessionId) {
      headers.Authorization = `Bearer ${currentSessionId}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        setIsAuthenticated(false);
        setSessionId(null);
        localStorage.removeItem("adminSessionId");
        toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setIsAuthenticated(true);
      localStorage.setItem("adminSessionId", data.sessionId);
      toast({ title: "Success", description: "Logged in successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Invalid credentials", variant: "destructive" });
    },
  });

  const { data: offers = [], refetch: refetchOffers } = useQuery<AdminOffer[]>({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const currentSessionId = sessionId || localStorage.getItem("adminSessionId");
      const headers: any = { "Content-Type": "application/json" };
      if (currentSessionId) {
        headers.Authorization = `Bearer ${currentSessionId}`;
      }

      const response = await fetch("/api/admin/offers", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error.message.includes('401') || error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        setSessionId(null);
        localStorage.removeItem("adminSessionId");
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: submissions = [], refetch: refetchSubmissions } = useQuery<Submission[]>({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const currentSessionId = sessionId || localStorage.getItem("adminSessionId");
      const headers: any = { "Content-Type": "application/json" };
      if (currentSessionId) {
        headers.Authorization = `Bearer ${currentSessionId}`;
      }

      const response = await fetch("/api/admin/submissions", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error.message.includes('401') || error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        setSessionId(null);
        localStorage.removeItem("adminSessionId");
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: affiliates = [], refetch: refetchAffiliates } = useQuery<Affiliate[]>({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const currentSessionId = sessionId || localStorage.getItem("adminSessionId");
      const headers: any = { "Content-Type": "application/json" };
      if (currentSessionId) {
        headers.Authorization = `Bearer ${currentSessionId}`;
      }

      const response = await fetch("/api/admin/affiliates", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error.message.includes('401') || error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        setSessionId(null);
        localStorage.removeItem("adminSessionId");
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery<AdminSetting[]>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const currentSessionId = sessionId || localStorage.getItem("adminSessionId");
      if (!currentSessionId) {
        throw new Error("No session ID available");
      }
      
      const headers: any = { "Content-Type": "application/json" };
      headers.Authorization = `Bearer ${currentSessionId}`;

      const response = await fetch("/api/admin/settings", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: isAuthenticated && activeTab === "settings",
    retry: (failureCount, error: any) => {
      if (error.message.includes('401') || error.message.includes('Authentication required')) {
        setIsAuthenticated(false);
        setSessionId(null);
        localStorage.removeItem("adminSessionId");
        return false;
      }
      return failureCount < 3;
    },
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ offerId, updates }: { offerId: string; updates: any }) => {
      await apiRequest("PUT", `/api/admin/offers/${offerId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      setEditingOffer(null);
      toast({ title: "Success", description: "Offer updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update offer", variant: "destructive" });
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      await apiRequest("PUT", `/api/admin/offers/${offerId}`, { status: "accepted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      refetchOffers();
      refetchSubmissions();
      toast({ title: "Success", description: "Offer accepted and customer notified" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept offer", variant: "destructive" });
    },
  });

  const rejectOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      await apiRequest("PUT", `/api/admin/offers/${offerId}`, { status: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      refetchOffers();
      refetchSubmissions();
      toast({ title: "Success", description: "Offer rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject offer", variant: "destructive" });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      await apiRequest("DELETE", `/api/admin/offers/${offerId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      refetchOffers();
      refetchSubmissions();
      toast({ title: "Success", description: "Offer deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete offer", variant: "destructive" });
    },
  });

  const createAffiliateMutation = useMutation({
    mutationFn: async (affiliateData: any) => {
      await apiRequest("POST", "/api/admin/affiliates", affiliateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      refetchAffiliates();
      toast({ title: "Success", description: "Affiliate created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create affiliate", variant: "destructive" });
    },
  });

  const updateAffiliateMutation = useMutation({
    mutationFn: async ({ affiliateId, data }: { affiliateId: string; data: any }) => {
      await apiRequest("PUT", `/api/admin/affiliates/${affiliateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      refetchAffiliates();
      toast({ title: "Success", description: "Affiliate updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update affiliate", variant: "destructive" });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ settingKey, settingValue }: { settingKey: string; settingValue: string }) => {
      await apiRequest("PUT", `/api/admin/settings/${settingKey}`, { settingValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      refetchSettings();
      toast({ title: "Success", description: "Setting updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update setting", variant: "destructive" });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }

    setIsAuthenticated(false);
    setSessionId(null);
    localStorage.removeItem("adminSessionId");
    toast({ title: "Success", description: "Logged out successfully" });
  };

  const handleEditOffer = (offer: AdminOffer) => {
    setEditingOffer(offer);
    setEditForm({ offerPrice: offer.offerPrice, notes: offer.notes || "" });
  };

  const handleUpdateOffer = () => {
    if (!editingOffer) return;

    updateOfferMutation.mutate({
      offerId: editingOffer.id,
      updates: {
        offerPrice: parseFloat(editForm.offerPrice),
        notes: editForm.notes,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "secondary",
      accepted: "default",
      rejected: "destructive",
    };

    const safeStatus = status || "pending";

    return (
      <Badge variant={statusColors[safeStatus as keyof typeof statusColors] || "secondary"}>
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter and paginate data
  const getFilteredData = () => {
    let data: any[] = [];
    
    if (activeTab === "submissions") {
      data = submissions;
      if (statusFilter === "with-offers") {
        data = data.filter((s: Submission) => s.offer);
      } else if (statusFilter === "without-offers") {
        data = data.filter((s: Submission) => !s.offer);
      } else if (statusFilter === "affiliate") {
        data = data.filter((s: Submission) => s.affiliateCode);
      } else if (statusFilter === "direct") {
        data = data.filter((s: Submission) => !s.affiliateCode);
      }
    } else if (activeTab === "offers") {
      data = offers;
      if (statusFilter) {
        data = data.filter((o: AdminOffer) => o.status === statusFilter);
      }
    } else if (activeTab === "affiliates") {
      data = affiliates;
      if (statusFilter === "active") {
        data = data.filter((a: Affiliate) => a.isActive === "true");
      } else if (statusFilter === "inactive") {
        data = data.filter((a: Affiliate) => a.isActive === "false");
      }
    }
    
    return data;
  };

  const getPaginatedData = () => {
    const filteredData = getFilteredData();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredData().length / ITEMS_PER_PAGE);
  };

  const handleKPIClick = (filterType: string) => {
    setStatusFilter(statusFilter === filterType ? null : filterType);
    setCurrentPage(1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    totalSubmissions: submissions.length,
    submissionsWithOffers: submissions.filter((s: Submission) => s.offer).length,
    submissionsWithoutOffers: submissions.filter((s: Submission) => !s.offer).length,
    affiliateSubmissions: submissions.filter((s: Submission) => s.affiliateCode).length,
    directSubmissions: submissions.filter((s: Submission) => !s.affiliateCode).length,
    totalOffers: offers.length,
    pendingOffers: offers.filter((o: AdminOffer) => o.status === "pending").length,
    acceptedOffers: offers.filter((o: AdminOffer) => o.status === "accepted").length,
    rejectedOffers: offers.filter((o: AdminOffer) => o.status === "rejected").length,
    totalAffiliates: affiliates.length,
    activeAffiliates: affiliates.filter((a: Affiliate) => a.isActive === "true").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Admin Dashboard
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "submissions" && !statusFilter ? "ring-2 ring-primary" : "hover:bg-gray-50"}`}
            onClick={() => {
              setActiveTab("submissions");
              handleKPIClick("");
            }}
          >
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.totalSubmissions}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Submissions</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "submissions" && statusFilter === "affiliate" ? "ring-2 ring-primary" : "hover:bg-gray-50"}`}
            onClick={() => {
              setActiveTab("submissions");
              handleKPIClick("affiliate");
            }}
          >
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.affiliateSubmissions}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Affiliate Leads</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "submissions" && statusFilter === "direct" ? "ring-2 ring-primary" : "hover:bg-gray-50"}`}
            onClick={() => {
              setActiveTab("submissions");
              handleKPIClick("direct");
            }}
          >
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{stats.directSubmissions}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Direct Leads</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "offers" && statusFilter === "pending" ? "ring-2 ring-primary" : "hover:bg-gray-50"}`}
            onClick={() => {
              setActiveTab("offers");
              handleKPIClick("pending");
            }}
          >
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingOffers}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Offers</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "offers" && statusFilter === "accepted" ? "ring-2 ring-primary" : "hover:bg-gray-50"}`}
            onClick={() => {
              setActiveTab("offers");
              handleKPIClick("accepted");
            }}
          >
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.acceptedOffers}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Accepted Offers</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "offers" && statusFilter === "rejected" ? "ring-2 ring-primary" : "hover:bg-gray-50"}`}
            onClick={() => {
              setActiveTab("offers");
              handleKPIClick("rejected");
            }}
          >
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.rejectedOffers}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected Offers</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <div className="flex space-x-2 mt-2">
              <Button
                variant={activeTab === "submissions" ? "default" : "outline"}
                onClick={() => setActiveTab("submissions")}
              >
                Submissions ({stats.totalSubmissions})
              </Button>
              <Button
                variant={activeTab === "offers" ? "default" : "outline"}
                onClick={() => setActiveTab("offers")}
              >
                Offers ({stats.totalOffers})
              </Button>
              <Button
                variant={activeTab === "affiliates" ? "default" : "outline"}
                onClick={() => setActiveTab("affiliates")}
              >
                Affiliates ({stats.totalAffiliates})
              </Button>
              <Button
                variant={activeTab === "settings" ? "default" : "outline"}
                onClick={() => setActiveTab("settings")}
              >
                Settings
              </Button>
            </div>
            {statusFilter && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">Filter: {statusFilter.replace("-", " ")}</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleKPIClick("")}
                  className="h-6 px-2"
                >
                  Clear
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {activeTab === "submissions" && (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>VIN</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Affiliate</TableHead>
                        <TableHead>Title Condition</TableHead>
                        <TableHead>Vehicle Condition</TableHead>
                        <TableHead>Odometer</TableHead>
                        <TableHead>Photos</TableHead>
                        <TableHead>Offer Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaginatedData().map((submission: Submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-mono text-sm">
                            <button
                              onClick={() => window.open(`/view/${submission.id}`, '_blank')}
                              className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                              title="View submission details"
                            >
                              {submission.vin}
                            </button>
                          </TableCell>
                          <TableCell>{submission.ownerName}</TableCell>
                          <TableCell>{submission.email}</TableCell>
                          <TableCell>{submission.phoneNumber}</TableCell>
                          <TableCell>
                            {submission.affiliateCode ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {submission.affiliateCode}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">Direct</span>
                            )}
                          </TableCell>
                          <TableCell>{submission.titleCondition}</TableCell>
                          <TableCell>{submission.vehicleCondition || 'Not specified'}</TableCell>
                          <TableCell>{submission.odometerReading || 'Not specified'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {submission.pictures.length} photos
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {submission.offer ? (
                              <div className="space-y-1">
                                {getStatusBadge(submission.offer.status)}
                                <div className="text-sm font-semibold text-green-600">
                                  ${parseFloat(submission.offer.offerPrice).toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="secondary">No Offer</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(submission.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/view/${submission.id}`, '_blank')}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination for Submissions */}
                {getTotalPages() > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                            className={currentPage === getTotalPages() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}

            {activeTab === "offers" && (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>VIN</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Offer Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaginatedData().map((offer: AdminOffer) => (
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
                          <TableCell className="font-semibold">
                            ${parseFloat(offer.offerPrice).toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(offer.status)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(offer.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {offer.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => acceptOfferMutation.mutate(offer.id)}
                                    disabled={acceptOfferMutation.isPending}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => rejectOfferMutation.mutate(offer.id)}
                                    disabled={rejectOfferMutation.isPending}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditOffer(offer)}
                                  >
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Offer</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">Offer Price</label>
                                      <Input
                                        type="number"
                                        value={editForm.offerPrice}
                                        onChange={(e) => setEditForm({ ...editForm, offerPrice: e.target.value })}
                                        placeholder="Enter offer amount"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Notes</label>
                                      <Textarea
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                        placeholder="Add notes..."
                                      />
                                    </div>
                                    <div className="flex justify-between">
                                      <Button
                                        variant="destructive"
                                        onClick={() => deleteOfferMutation.mutate(offer.id)}
                                        disabled={deleteOfferMutation.isPending}
                                      >
                                        Delete Offer
                                      </Button>
                                      <Button
                                        onClick={handleUpdateOffer}
                                        disabled={updateOfferMutation.isPending}
                                      >
                                        Update Offer
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination for Offers */}
                {getTotalPages() > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                            className={currentPage === getTotalPages() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}

            {activeTab === "settings" && (
              <Card>
                <CardHeader>
                  <CardTitle>Application Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Margin Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Offer Margin Configuration</h3>
                      <p className="text-sm text-gray-600">
                        The margin is deducted from the calculated offer amount shown to customers.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Margin Type</label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={settings.find(s => s.settingKey === 'margin_type')?.settingValue || 'percentage'}
                            onChange={(e) => updateSettingMutation.mutate({ 
                              settingKey: 'margin_type', 
                              settingValue: e.target.value 
                            })}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Margin Value {settings.find(s => s.settingKey === 'margin_type')?.settingValue === 'percentage' ? '(%)' : '($)'}
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={settings.find(s => s.settingKey === 'margin_value')?.settingValue || '10'}
                            onChange={(e) => updateSettingMutation.mutate({ 
                              settingKey: 'margin_value', 
                              settingValue: e.target.value 
                            })}
                            placeholder={settings.find(s => s.settingKey === 'margin_type')?.settingValue === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-900">
                          <strong>Example:</strong> If the calculated offer is $5,000 and margin is{' '}
                          {settings.find(s => s.settingKey === 'margin_type')?.settingValue === 'percentage' 
                            ? `${settings.find(s => s.settingKey === 'margin_value')?.settingValue || '10'}%`
                            : `$${settings.find(s => s.settingKey === 'margin_value')?.settingValue || '500'}`
                          }, the customer will see an offer of{' '}
                          {settings.find(s => s.settingKey === 'margin_type')?.settingValue === 'percentage'
                            ? `$${(5000 * (1 - parseFloat(settings.find(s => s.settingKey === 'margin_value')?.settingValue || '10') / 100)).toFixed(2)}`
                            : `$${(5000 - parseFloat(settings.find(s => s.settingKey === 'margin_value')?.settingValue || '500')).toFixed(2)}`
                          }.
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Service Charge</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Fixed service charge per vehicle (in addition to margin).
                      </p>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Service Charge per Car ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={settings.find(s => s.settingKey === 'service_charge')?.settingValue || '50'}
                          onChange={(e) => updateSettingMutation.mutate({ 
                            settingKey: 'service_charge', 
                            settingValue: e.target.value 
                          })}
                          placeholder="e.g., 50.00"
                          className="max-w-xs"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Last Updated</h3>
                      <div className="space-y-2">
                        {settings.map((setting) => (
                          <div key={setting.id} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{setting.description || setting.settingKey}</span>
                            <Badge variant="outline">
                              {new Date(setting.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "affiliates" && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Affiliate Management</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <i className="fas fa-plus mr-2"></i>
                          Add Affiliate
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Affiliate</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit((data) => createAffiliateMutation.mutate(data))}>
                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Affiliate name" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="email" placeholder="affiliate@example.com" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="(555) 123-4567" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="commissionRate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Commission Rate</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="0.05" step="0.01" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full">
                                Create Affiliate
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Unique Code</TableHead>
                          <TableHead>Commission Rate</TableHead>
                          <TableHead>Referral Link</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedData().map((affiliate: Affiliate) => (
                          <TableRow key={affiliate.id}>
                            <TableCell>{affiliate.name}</TableCell>
                            <TableCell>{affiliate.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{affiliate.uniqueCode}</Badge>
                            </TableCell>
                            <TableCell>{(parseFloat(affiliate.commissionRate) * 100).toFixed(2)}%</TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-100 p-1 rounded">
                                {window.location.origin}/ref/{affiliate.uniqueCode}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant={affiliate.isActive === "true" ? "default" : "destructive"}>
                                {affiliate.isActive === "true" ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <i className="fas fa-ellipsis-h"></i>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/ref/${affiliate.uniqueCode}`)}
                                  >
                                    <i className="fas fa-copy mr-2"></i>
                                    Copy Link
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => updateAffiliateMutation.mutate({
                                      affiliateId: affiliate.id,
                                      data: { isActive: affiliate.isActive === "true" ? "false" : "true" }
                                    })}
                                  >
                                    <i className={`fas ${affiliate.isActive === "true" ? "fa-pause" : "fa-play"} mr-2`}></i>
                                    {affiliate.isActive === "true" ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination for Affiliates */}
                    {getTotalPages() > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                                className={currentPage === getTotalPages() ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

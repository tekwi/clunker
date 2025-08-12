
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

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

export default function AdminDashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null);
  const [editForm, setEditForm] = useState({ offerPrice: "", notes: "" });
  const queryClient = useQueryClient();

  useEffect(() => {
    const savedSessionId = localStorage.getItem("adminSessionId");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      setIsAuthenticated(true);
    }
  }, []);

  const apiRequest = async (method: string, url: string, data?: any) => {
    const headers: any = { "Content-Type": "application/json" };
    if (sessionId) {
      headers.Authorization = `Bearer ${sessionId}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
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

  const { data: offers = [], refetch } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/offers");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ offerId, updates }: { offerId: string; updates: any }) => {
      await apiRequest("PUT", `/api/admin/offers/${offerId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
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
      toast({ title: "Success", description: "Offer rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject offer", variant: "destructive" });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      await apiRequest("DELETE", `/api/admin/offers/${offerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast({ title: "Success", description: "Offer deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete offer", variant: "destructive" });
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
    
    return (
      <Badge variant={statusColors[status as keyof typeof statusColors] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  const stats = {
    total: offers.length,
    pending: offers.filter((o: AdminOffer) => o.status === "pending").length,
    accepted: offers.filter((o: AdminOffer) => o.status === "accepted").length,
    rejected: offers.filter((o: AdminOffer) => o.status === "rejected").length,
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Offers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Accepted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Offers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Offers</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {offers.map((offer: AdminOffer) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

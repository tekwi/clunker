import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AffiliateSubmission {
  id: string;
  submissionId: string;
  commissionAmount: string | null;
  status: string;
  createdAt: string;
  submission?: {
    id: string;
    vin: string;
    ownerName: string;
    email: string;
    createdAt: string;
  };
}

interface AffiliateData {
  affiliate: {
    name: string;
    email: string;
    uniqueCode: string;
    commissionRate: string;
    totalEarnings: string;
  };
  submissions: AffiliateSubmission[];
}

export default function AffiliateDashboard() {
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get("code");

  const { data, isLoading, error } = useQuery<AffiliateData>({
    queryKey: ["affiliate-dashboard", affiliateCode],
    queryFn: async () => {
      if (!affiliateCode) {
        throw new Error("Affiliate code is required");
      }

      const response = await fetch(`/api/affiliate/${affiliateCode}`);
      if (!response.ok) {
        throw new Error("Failed to fetch affiliate data");
      }
      return response.json();
    },
    enabled: !!affiliateCode,
  });

  if (!affiliateCode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
              <p className="text-gray-600">Please use the link provided in your welcome email to access your affiliate dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
              <p className="text-gray-600">Failed to load affiliate dashboard. Please check your affiliate code and try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalEarnings = parseFloat(data.affiliate.totalEarnings || "0");
  const pendingCommissions = data.submissions
    .filter(sub => sub.status === "pending")
    .reduce((sum, sub) => sum + parseFloat(sub.commissionAmount || "0"), 0);
  const earnedCommissions = data.submissions
    .filter(sub => sub.status === "earned")
    .reduce((sum, sub) => sum + parseFloat(sub.commissionAmount || "0"), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Affiliate Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {data.affiliate.name}!</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.submissions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${pendingCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Earned Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${earnedCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${totalEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Affiliate Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Affiliate Code</label>
              <div className="mt-1 p-3 bg-gray-100 rounded-md font-mono text-sm">
                {data.affiliate.uniqueCode}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Commission Rate</label>
              <div className="mt-1 p-3 bg-gray-100 rounded-md font-semibold text-sm">
                {(parseFloat(data.affiliate.commissionRate) * 100).toFixed(2)}%
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600">Your Referral Link</label>
              <div className="mt-1 flex">
                <input
                  type="text"
                  value={`${window.location.origin}/ref/${data.affiliate.uniqueCode}`}
                  readOnly
                  className="flex-1 p-3 bg-gray-100 rounded-l-md font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/ref/${data.affiliate.uniqueCode}`)}
                  className="px-4 py-3 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {data.submissions.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No referrals yet</h3>
              <p className="text-gray-600">Start sharing your referral link to see submissions here!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{submission.submission?.ownerName || "N/A"}</div>
                        <div className="text-sm text-gray-600">{submission.submission?.email || "N/A"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 p-1 rounded">
                        {submission.submission?.vin || "N/A"}
                      </code>
                    </TableCell>
                    <TableCell>
                      {submission.commissionAmount
                        ? `$${parseFloat(submission.commissionAmount).toFixed(2)}`
                        : "TBD"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          submission.status === "earned" ? "default" :
                          submission.status === "paid" ? "secondary" :
                          "outline"
                        }
                      >
                        {submission.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
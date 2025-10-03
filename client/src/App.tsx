import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import Home from "./pages/home";
import ViewSubmission from "./pages/view-submission";
import AdminDashboard from "./pages/admin-dashboard";
import AffiliateDashboard from "./pages/affiliate-dashboard";
import NotFound from "./pages/not-found";

function Router() {
  const [location] = useLocation();
  // Force re-render when URL changes by including location in the key
  const params = new URLSearchParams(window.location.search);
  const showForm = params.get('start') === 'true';

  return (
    <Switch>
      <Route path="/">
        <Home key={window.location.search} showForm={showForm} />
      </Route>
      <Route path="/view/:submissionId" component={ViewSubmission} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/affiliate-dashboard" component={AffiliateDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
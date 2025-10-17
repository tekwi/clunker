import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import Home from "./pages/home";
import ViewSubmission from "./pages/view-submission";
import AdminDashboard from "./pages/admin-dashboard";
import AffiliateDashboard from "./pages/affiliate-dashboard";
import PrivacyPolicy from "./pages/privacy-policy";
import BlogManagement from "./pages/blog-management";
import BlogPost from "./pages/blog-post";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>
      <Route path="/view/:submissionId" component={ViewSubmission} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/blog" component={BlogManagement} />
      <Route path="/affiliate-dashboard" component={AffiliateDashboard} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/sell-my-car/:make/:model" component={BlogPost} />
      <Route path="/junk-car-removal/:state/:city" component={BlogPost} />
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
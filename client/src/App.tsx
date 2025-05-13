import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Import pages
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ClientDetailsPage from "@/pages/client-details";
import LoansPage from "@/pages/loans";
import LoanDetailsPage from "@/pages/loan-details";
import PaymentsPage from "@/pages/payments";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Switch>
      {/* Main routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/clients/:id" component={ClientDetailsPage} />
      <Route path="/loans" component={LoansPage} />
      <Route path="/loans/:id" component={LoanDetailsPage} />
      <Route path="/payments" component={PaymentsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/settings" component={SettingsPage} />
      
      {/* Fallback to 404 */}
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

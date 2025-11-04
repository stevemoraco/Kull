import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { SupportChat } from "@/components/SupportChat";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Checkout from "@/pages/Checkout";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import Credits from "@/pages/Credits";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Refunds from "@/pages/Refunds";
import Support from "@/pages/Support";
import Contact from "@/pages/Contact";
import About from "@/pages/About";
import Download from "@/pages/Download";
import ShootProgress from "@/pages/ShootProgress";
import Marketplace from "@/pages/Marketplace";
import PromptDetail from "@/pages/PromptDetail";
import MyPrompts from "@/pages/MyPrompts";
import DeviceAuth from "@/pages/DeviceAuth";
import DeviceSessions from "@/pages/DeviceSessions";
import Reports from "@/pages/Reports";
import ReportDetail from "@/pages/ReportDetail";
import SharedReport from "@/pages/SharedReport";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = user?.email === 'steve@lander.media';
  const { toast } = useToast();

  // Global WebSocket sync integration
  useWebSocket({
    onCreditUpdate: (data) => {
      console.log('[App] Credit update received:', data);
      // Refetch user balance
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });

      // Show notification
      toast({
        title: data.change > 0 ? 'Credits Added' : 'Credits Used',
        description: `${data.change > 0 ? '+' : ''}${data.change} credits. New balance: ${data.newBalance}`,
      });
    },
    onPromptChange: (data) => {
      console.log('[App] Prompt change received:', data);
      // Refetch marketplace prompts
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
    },
    onDeviceConnected: (data) => {
      console.log('[App] Device connected:', data.deviceId);
      toast({
        title: 'Device Connected',
        description: `${data.deviceName || 'A device'} connected to your account`,
      });
    },
    onDeviceDisconnected: (data) => {
      console.log('[App] Device disconnected:', data.deviceId);
    },
  });

  // Debug logging
  console.log('[Router] Auth state:', {
    isAuthenticated,
    isLoading,
    userEmail: user?.email,
    isAdmin
  });

  return (
    <Switch>
      {/* Public pages accessible to all */}
      <Route path="/landing" component={Landing} />
      <Route path="/features" component={Landing} /> {/* Redirect /features to /landing */}
      <Route path="/about" component={About} />
      <Route path="/pricing" component={Dashboard} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refunds" component={Refunds} />
      <Route path="/support" component={Support} />
      <Route path="/contact" component={Contact} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/download" component={Download} />

      {/* Marketplace routes */}
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/marketplace/:id" component={PromptDetail} />
      <Route path="/my-prompts" component={MyPrompts} />

      {/* Shoot progress page */}
      <Route path="/shoots/:shootId" component={ShootProgress} />

      {/* Device authentication routes */}
      <Route path="/device-auth" component={DeviceAuth} />
      <Route path="/settings/devices" component={DeviceSessions} />

      {/* Report routes */}
      <Route path="/reports/shared/:token" component={SharedReport} />
      <Route path="/reports/:id" component={ReportDetail} />
      <Route path="/reports">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          return <Reports />;
        }}
      </Route>

      {/* Credits page - authenticated users only */}
      <Route path="/credits">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          return <Credits />;
        }}
      </Route>

      {/* Admin page - only for steve@lander.media */}
      {/* Render unconditionally but check auth inside the route */}
      <Route path="/admin">
        {() => {
          console.log('[Router] /admin route matched, checking admin access');
          console.log('[Router] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

          // Show loading state while auth is being checked
          if (isLoading) {
            console.log('[Router] Auth still loading, showing spinner');
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }

          if (!isAuthenticated) {
            console.log('[Router] Not authenticated, redirecting to landing');
            window.location.href = '/landing';
            return null;
          }
          if (!isAdmin) {
            console.log('[Router] Not admin user (email:', user?.email, '), access denied');
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground">Admin access required</p>
                <p className="text-sm text-muted-foreground mt-2">Current user: {user?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Required: steve@lander.media</p>
              </div>
            </div>;
          }
          console.log('[Router] Admin access granted');
          return <Admin />;
        }}
      </Route>

      {/* Auth-conditional pages */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route path="/" component={Home} />
      )}
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
        <SupportChat />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { CodeInput } from '@/components/device-auth/CodeInput';
import { DeviceInfo } from '@/components/device-auth/DeviceInfo';
import { ApprovalConfirmation } from '@/components/device-auth/ApprovalConfirmation';
import { getCodeStatus, approveDevice } from '@/api/device-auth';
import type { DevicePlatform } from '@shared/types/device';

type ViewState = 'enter-code' | 'verify-code' | 'approve-device' | 'success' | 'error';

interface DeviceDetails {
  platform: DevicePlatform;
  deviceName: string;
  appVersion: string;
  deviceId: string;
}

/**
 * Device Authentication Page
 *
 * Flow:
 * 1. If no code in URL: Show code input form
 * 2. If code in URL: Verify code and show device info
 * 3. If not logged in: Prompt to log in
 * 4. If logged in: Show approve button
 * 5. After approval: Show success confirmation
 */
export default function DeviceAuth() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('enter-code');
  const [code, setCode] = useState('');
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check URL params for code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');

    if (urlCode) {
      setCode(urlCode.toUpperCase());
      verifyCode(urlCode.toUpperCase());
    }
  }, []);

  const verifyCode = async (codeToVerify: string) => {
    setViewState('verify-code');
    setError('');

    try {
      const status = await getCodeStatus(codeToVerify);

      if (status.status === 'expired') {
        setError('This code has expired. Please generate a new code from your device.');
        setViewState('error');
        return;
      }

      if (status.status === 'approved') {
        setError('This code has already been used. Please generate a new code from your device.');
        setViewState('error');
        return;
      }

      // Code is valid and pending - fetch device info
      // In a real implementation, the status response would include device details
      // For now, we'll show the approval screen
      setViewState('approve-device');

      // Mock device details - in production, this would come from the API
      setDeviceDetails({
        platform: 'macos',
        deviceName: 'User\'s Device',
        appVersion: '1.0.0',
        deviceId: status.deviceId || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to verify code. Please try again.');
      setViewState('error');
    }
  };

  const handleCodeComplete = (enteredCode: string) => {
    setCode(enteredCode);
    // Update URL with code
    window.history.pushState({}, '', `/device-auth?code=${enteredCode}`);
    verifyCode(enteredCode);
  };

  const handleApprove = async () => {
    if (!isAuthenticated) {
      // Redirect to login, then back here
      window.location.href = `/api/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      await approveDevice(code);
      setViewState('success');
    } catch (err: any) {
      setError(err.message || 'Failed to approve device. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setCode('');
    setError('');
    setDeviceDetails(null);
    setViewState('enter-code');
    window.history.pushState({}, '', '/device-auth');
  };

  // Render based on current view state
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Device Authentication</h1>
          <p className="text-muted-foreground">
            Connect your Kull AI app to your account
          </p>
        </div>

        {/* Enter Code View */}
        {viewState === 'enter-code' && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Your Device Code</CardTitle>
              <CardDescription>
                Enter the 6-character code shown on your device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <CodeInput onComplete={handleCodeComplete} />

                <Alert>
                  <AlertDescription className="text-sm">
                    The code will expire after 10 minutes. Generate a new code from your device if needed.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verify Code Loading */}
        {viewState === 'verify-code' && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Verifying code...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approve Device View */}
        {viewState === 'approve-device' && (
          <div className="space-y-6">
            {deviceDetails && (
              <DeviceInfo
                platform={deviceDetails.platform}
                deviceName={deviceDetails.deviceName}
                appVersion={deviceDetails.appVersion}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Approve This Device?</CardTitle>
                <CardDescription>
                  This will give the device access to your Kull AI account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!isAuthenticated && !authLoading && (
                    <Alert>
                      <AlertDescription>
                        You need to sign in to approve this device
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleApprove}
                      disabled={isProcessing || authLoading}
                      className="flex-1"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : authLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : !isAuthenticated ? (
                        'Sign In to Approve'
                      ) : (
                        'Approve Device'
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleRetry}
                      disabled={isProcessing}
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success View */}
        {viewState === 'success' && (
          <ApprovalConfirmation autoCloseDelay={5000} showManageLink={true} />
        )}

        {/* Error View */}
        {viewState === 'error' && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Verification Failed</h3>
                  <p className="text-muted-foreground">{error}</p>
                </div>

                <Button onClick={handleRetry} variant="default">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Laptop, Smartphone, Tablet, MoreVertical, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getUserDevices, revokeDevice, revokeAllDevices } from '@/api/device-auth';
import type { DeviceSessionInfo } from '@/api/device-auth';
import type { DevicePlatform } from '@shared/types/device';

/**
 * Device Sessions Management Page
 *
 * Allows users to:
 * - View all active device sessions
 * - Revoke individual devices
 * - Revoke all devices except current
 */
export default function DeviceSessions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceSessionInfo | null>(null);

  // Note: This page is designed for web access, so we don't have a device token
  // In a real implementation, you'd need to handle authentication differently
  // For demo purposes, we'll show a message that this requires native app access
  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['device-sessions'],
    queryFn: async () => {
      // This would need to be called with a valid access token
      // For web-based management, you might want to create a separate endpoint
      // that uses session authentication instead of device tokens
      throw new Error('Device management requires authentication from a native app');
    },
    retry: false,
  });

  const revokeMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      // Would need access token
      throw new Error('Not implemented - requires device token');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-sessions'] });
      toast({
        title: 'Device Revoked',
        description: 'The device has been successfully disconnected from your account.',
      });
      setRevokeDialogOpen(false);
      setSelectedDevice(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      // Would need access token
      throw new Error('Not implemented - requires device token');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['device-sessions'] });
      toast({
        title: 'Devices Revoked',
        description: `Successfully revoked ${data.revokedCount} device(s).`,
      });
      setRevokeAllDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRevoke = (device: DeviceSessionInfo) => {
    setSelectedDevice(device);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = () => {
    if (selectedDevice) {
      revokeMutation.mutate(selectedDevice.deviceId);
    }
  };

  const confirmRevokeAll = () => {
    revokeAllMutation.mutate();
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Device Sessions</h1>
          <p className="text-muted-foreground">
            Manage devices that have access to your Kull AI account
          </p>
        </div>

        {/* Info Alert - Explaining this is a demo/placeholder */}
        <Alert className="mb-6">
          <AlertDescription>
            <strong>Note:</strong> Device session management is designed to be accessed from native Kull AI apps.
            This page demonstrates the UI for managing connected devices. In production, users would access this
            through the app's settings menu with proper authentication.
          </AlertDescription>
        </Alert>

        {/* Demo Content - Shows what the interface would look like */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Devices</CardTitle>
                <CardDescription>
                  Devices currently connected to your account
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setRevokeAllDialogOpen(true)}
                disabled={true}
              >
                Revoke All Others
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Demo Devices */}
            <div className="space-y-4">
              {/* Example Current Device */}
              <DeviceSessionCard
                device={{
                  id: '1',
                  deviceId: 'demo-mac',
                  platform: 'macos' as const,
                  deviceName: "Steve's MacBook Pro",
                  lastSeen: new Date(),
                  isCurrentDevice: true,
                  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                }}
                onRevoke={handleRevoke}
                formatLastSeen={formatLastSeen}
              />

              {/* Example Other Device */}
              <DeviceSessionCard
                device={{
                  id: '2',
                  deviceId: 'demo-iphone',
                  platform: 'ios' as const,
                  deviceName: "Steve's iPhone",
                  lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
                  isCurrentDevice: false,
                  createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                }}
                onRevoke={handleRevoke}
                formatLastSeen={formatLastSeen}
              />

              {/* Example iPad */}
              <DeviceSessionCard
                device={{
                  id: '3',
                  deviceId: 'demo-ipad',
                  platform: 'ipados' as const,
                  deviceName: "Steve's iPad Pro",
                  lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  isCurrentDevice: false,
                  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                }}
                onRevoke={handleRevoke}
                formatLastSeen={formatLastSeen}
              />
            </div>

            {!devices && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Demo: Active device sessions would appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revoke Single Device Dialog */}
        <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Device Access?</AlertDialogTitle>
              <AlertDialogDescription>
                This will disconnect "{selectedDevice?.deviceName}" from your account.
                You'll need to approve it again to use Kull AI on this device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRevoke}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Revoke Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revoke All Devices Dialog */}
        <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke All Other Devices?</AlertDialogTitle>
              <AlertDialogDescription>
                This will disconnect all devices except your current one. This action cannot be undone,
                and you'll need to approve each device again to use Kull AI on them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRevokeAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Revoke All Others
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

interface DeviceSessionCardProps {
  device: DeviceSessionInfo;
  onRevoke: (device: DeviceSessionInfo) => void;
  formatLastSeen: (date: Date) => string;
}

function DeviceSessionCard({ device, onRevoke, formatLastSeen }: DeviceSessionCardProps) {
  const icon = getPlatformIcon(device.platform);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Platform Icon */}
      <div className="flex-shrink-0 p-3 rounded-full bg-primary/10">
        {icon}
      </div>

      {/* Device Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{device.deviceName}</h3>
          {device.isCurrentDevice && (
            <Badge variant="default" className="shrink-0">
              Current Device
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {getPlatformLabel(device.platform)} • Last seen {formatLastSeen(device.lastSeen)}
        </p>
      </div>

      {/* Actions */}
      {!device.isCurrentDevice && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onRevoke(device)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Revoke Access
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function getPlatformIcon(platform: DevicePlatform) {
  switch (platform) {
    case 'macos':
      return <Laptop className="w-6 h-6 text-primary" />;
    case 'ios':
      return <Smartphone className="w-6 h-6 text-primary" />;
    case 'ipados':
      return <Tablet className="w-6 h-6 text-primary" />;
    default:
      return <Smartphone className="w-6 h-6 text-primary" />;
  }
}

function getPlatformLabel(platform: DevicePlatform): string {
  switch (platform) {
    case 'macos':
      return 'macOS';
    case 'ios':
      return 'iOS';
    case 'ipados':
      return 'iPadOS';
    default:
      return platform;
  }
}

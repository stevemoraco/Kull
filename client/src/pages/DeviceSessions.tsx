import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Laptop, Smartphone, Tablet, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getUserDevicesWeb, revokeDeviceWeb, revokeAllDevicesWeb, renameDeviceWeb } from '@/api/device-auth';
import type { DeviceSessionInfo } from '@/api/device-auth';
import type { DevicePlatform } from '@shared/types/device';

/**
 * Device Sessions Management Page
 *
 * Allows users to:
 * - View all active device sessions
 * - Revoke individual devices
 * - Rename devices
 * - Revoke all devices
 */
export default function DeviceSessions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceSessionInfo | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');

  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['device-sessions'],
    queryFn: getUserDevicesWeb,
    retry: 1,
  });

  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) => revokeDeviceWeb(deviceId),
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
    mutationFn: revokeAllDevicesWeb,
    onSuccess: (data) => {
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

  const renameMutation = useMutation({
    mutationFn: ({ deviceId, deviceName }: { deviceId: string; deviceName: string }) =>
      renameDeviceWeb(deviceId, deviceName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-sessions'] });
      toast({
        title: 'Device Renamed',
        description: 'The device name has been successfully updated.',
      });
      setRenameDialogOpen(false);
      setSelectedDevice(null);
      setNewDeviceName('');
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

  const handleRename = (device: DeviceSessionInfo) => {
    setSelectedDevice(device);
    setNewDeviceName(device.deviceName);
    setRenameDialogOpen(true);
  };

  const confirmRevoke = () => {
    if (selectedDevice) {
      revokeMutation.mutate(selectedDevice.deviceId);
    }
  };

  const confirmRename = () => {
    if (selectedDevice && newDeviceName.trim()) {
      renameMutation.mutate({
        deviceId: selectedDevice.deviceId,
        deviceName: newDeviceName.trim(),
      });
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

        {/* Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Devices</CardTitle>
                <CardDescription>
                  Devices currently connected to your account
                </CardDescription>
              </div>
              {devices && devices.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setRevokeAllDialogOpen(true)}
                  disabled={revokeAllMutation.isPending}
                >
                  Revoke All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading device sessions...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12 text-destructive">
                <p>Failed to load device sessions. Please try again later.</p>
                <p className="text-sm mt-2">{(error as Error).message}</p>
              </div>
            )}

            {devices && devices.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No active device sessions found.</p>
                <p className="text-sm mt-2">
                  Download the Kull AI app on macOS or iOS to get started.
                </p>
              </div>
            )}

            {devices && devices.length > 0 && (
              <div className="space-y-4">
                {devices.map((device) => (
                  <DeviceSessionCard
                    key={device.deviceId}
                    device={device}
                    onRevoke={handleRevoke}
                    onRename={handleRename}
                    formatLastSeen={formatLastSeen}
                  />
                ))}
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
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Access'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revoke All Devices Dialog */}
        <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke All Devices?</AlertDialogTitle>
              <AlertDialogDescription>
                This will disconnect all devices from your account. This action cannot be undone,
                and you'll need to approve each device again to use Kull AI on them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRevokeAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={revokeAllMutation.isPending}
              >
                {revokeAllMutation.isPending ? 'Revoking...' : 'Revoke All'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rename Device Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Device</DialogTitle>
              <DialogDescription>
                Enter a new name for "{selectedDevice?.deviceName}"
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="Enter device name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDeviceName.trim()) {
                    confirmRename();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRenameDialogOpen(false);
                  setNewDeviceName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRename}
                disabled={!newDeviceName.trim() || renameMutation.isPending}
              >
                {renameMutation.isPending ? 'Renaming...' : 'Rename'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface DeviceSessionCardProps {
  device: DeviceSessionInfo;
  onRevoke: (device: DeviceSessionInfo) => void;
  onRename: (device: DeviceSessionInfo) => void;
  formatLastSeen: (date: Date) => string;
}

function DeviceSessionCard({ device, onRevoke, onRename, formatLastSeen }: DeviceSessionCardProps) {
  const icon = getPlatformIcon(device.platform as DevicePlatform);

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
          {getPlatformLabel(device.platform as DevicePlatform)} • Last seen {formatLastSeen(device.lastSeen)}
        </p>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRename(device)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRevoke(device)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Revoke Access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

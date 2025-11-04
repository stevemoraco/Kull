import { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Tablet } from 'lucide-react';
import { DeviceConnectionData } from '@shared/types/sync';

interface ConnectedDevice extends DeviceConnectionData {
  isConnected: boolean;
}

export function DeviceList() {
  const [devices, setDevices] = useState<Map<string, ConnectedDevice>>(new Map());

  useWebSocket({
    onDeviceConnected: (data) => {
      console.log('[DeviceList] Device connected:', data.deviceId);
      setDevices(prev => {
        const next = new Map(prev);
        next.set(data.deviceId, {
          ...data,
          isConnected: true,
        });
        return next;
      });
    },
    onDeviceDisconnected: (data) => {
      console.log('[DeviceList] Device disconnected:', data.deviceId);
      setDevices(prev => {
        const next = new Map(prev);
        const device = next.get(data.deviceId);
        if (device) {
          next.set(data.deviceId, {
            ...device,
            isConnected: false,
          });
        }
        return next;
      });
    },
  });

  const getDeviceIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'ios':
      case 'ipados':
        return <Smartphone className="h-5 w-5" />;
      case 'macos':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Tablet className="h-5 w-5" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'ios':
        return 'iPhone';
      case 'ipados':
        return 'iPad';
      case 'macos':
        return 'Mac';
      default:
        return platform;
    }
  };

  const deviceArray = Array.from(devices.values());
  const connectedDevices = deviceArray.filter(d => d.isConnected);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Devices</CardTitle>
        <CardDescription>
          Devices currently synced with your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {deviceArray.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No devices connected</p>
            <p className="text-sm mt-2">
              Connect from your iPhone or Mac to see devices here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deviceArray.map(device => (
              <div
                key={device.deviceId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {getDeviceIcon(device.platform)}
                  </div>
                  <div>
                    <p className="font-medium">
                      {device.deviceName || getPlatformLabel(device.platform)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getPlatformLabel(device.platform)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={device.isConnected ? 'default' : 'secondary'}
                  className={device.isConnected ? 'bg-green-500' : ''}
                >
                  {device.isConnected ? 'Connected' : 'Offline'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {connectedDevices.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {connectedDevices.length} {connectedDevices.length === 1 ? 'device' : 'devices'} online
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

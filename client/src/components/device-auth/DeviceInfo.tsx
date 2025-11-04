import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DevicePlatform } from '@shared/types/device';

interface DeviceInfoProps {
  platform: DevicePlatform;
  deviceName: string;
  appVersion?: string;
}

/**
 * Display device information in a visually appealing card
 * Shows appropriate icon based on platform
 */
export function DeviceInfo({ platform, deviceName, appVersion }: DeviceInfoProps) {
  const platformInfo = getPlatformInfo(platform);

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          {/* Platform Icon */}
          <div className="flex-shrink-0 p-3 rounded-full bg-primary/10">
            {platformInfo.icon}
          </div>

          {/* Device Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold truncate">
                {deviceName}
              </h3>
              <Badge variant="secondary" className="shrink-0">
                {platformInfo.label}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              Kull AI for {platformInfo.label}
            </p>

            {appVersion && (
              <p className="text-xs text-muted-foreground mt-1">
                Version {appVersion}
              </p>
            )}
          </div>
        </div>

        {/* Security Message */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            This device is requesting access to your Kull AI account
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getPlatformInfo(platform: DevicePlatform) {
  switch (platform) {
    case 'macos':
      return {
        label: 'macOS',
        icon: <Laptop className="w-8 h-8 text-primary" />,
      };
    case 'ios':
      return {
        label: 'iOS',
        icon: <Smartphone className="w-8 h-8 text-primary" />,
      };
    case 'ipados':
      return {
        label: 'iPadOS',
        icon: <Tablet className="w-8 h-8 text-primary" />,
      };
    default:
      return {
        label: platform,
        icon: <Smartphone className="w-8 h-8 text-primary" />,
      };
  }
}

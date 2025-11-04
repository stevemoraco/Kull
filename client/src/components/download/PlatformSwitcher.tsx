import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Smartphone } from "lucide-react";

interface PlatformSwitcherProps {
  selectedPlatform: 'macos' | 'ios';
  onPlatformChange: (platform: 'macos' | 'ios') => void;
}

export function PlatformSwitcher({ selectedPlatform, onPlatformChange }: PlatformSwitcherProps) {
  return (
    <div className="flex justify-center mb-8">
      <Tabs value={selectedPlatform} onValueChange={(value) => onPlatformChange(value as 'macos' | 'ios')}>
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted" style={{ maxWidth: '400px' }}>
          <TabsTrigger
            value="macos"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground h-10 text-base"
            data-testid="platform-tab-macos"
          >
            <Apple className="w-4 h-4 mr-2" />
            macOS
          </TabsTrigger>
          <TabsTrigger
            value="ios"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground h-10 text-base"
            data-testid="platform-tab-ios"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            iOS / iPadOS
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

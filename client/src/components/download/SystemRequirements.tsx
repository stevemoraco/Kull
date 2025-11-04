import { CheckCircle2, AlertCircle, Monitor, Smartphone, HardDrive, Cpu } from "lucide-react";
import { detectPlatform } from "./PlatformDetector";
import type { VersionInfo } from "@/api/download";

interface SystemRequirementsProps {
  platform: 'macos' | 'ios';
  versionInfo: VersionInfo;
}

export function SystemRequirements({ platform, versionInfo }: SystemRequirementsProps) {
  const detectedPlatform = detectPlatform();

  // Check if user's system meets requirements
  const meetsRequirements = platform === 'macos'
    ? detectedPlatform === 'macos'
    : detectedPlatform === 'ios' || detectedPlatform === 'ipados';

  const macosRequirements = [
    {
      icon: Monitor,
      label: "Operating System",
      value: versionInfo.minimumOS,
    },
    {
      icon: Cpu,
      label: "Processor",
      value: "Apple Silicon or Intel",
    },
    {
      icon: HardDrive,
      label: "Storage",
      value: "100 MB free space",
    },
  ];

  const iosRequirements = [
    {
      icon: Smartphone,
      label: "Operating System",
      value: versionInfo.minimumOS,
    },
    {
      icon: HardDrive,
      label: "Storage",
      value: "50 MB free space",
    },
    {
      icon: Monitor,
      label: "Device",
      value: "iPhone or iPad",
    },
  ];

  const requirements = platform === 'macos' ? macosRequirements : iosRequirements;

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center text-foreground">
          System Requirements
        </h2>
        <p className="text-muted-foreground text-center mb-8 text-lg">
          Make sure your device meets these requirements
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {requirements.map((req, index) => (
            <div
              key={index}
              className="bg-card border border-card-border rounded-lg p-6 hover-elevate"
            >
              <req.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-card-foreground mb-2">{req.label}</h3>
              <p className="text-muted-foreground">{req.value}</p>
            </div>
          ))}
        </div>

        {/* System compatibility check */}
        <div
          className={`p-6 rounded-lg border ${
            meetsRequirements
              ? "bg-green-500/10 border-green-500/30"
              : "bg-yellow-500/10 border-yellow-500/30"
          }`}
        >
          <div className="flex items-start gap-4">
            {meetsRequirements ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3
                className={`font-bold mb-2 ${
                  meetsRequirements ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {meetsRequirements
                  ? "Your System is Compatible"
                  : "Different Platform Detected"}
              </h3>
              <p className="text-muted-foreground">
                {meetsRequirements ? (
                  <>
                    Great! Your device meets all the requirements for Kull AI on{" "}
                    {platform === 'macos' ? 'macOS' : 'iOS'}. You're ready to download and install.
                  </>
                ) : (
                  <>
                    We detected you're using a{" "}
                    {detectedPlatform === 'windows'
                      ? "Windows"
                      : detectedPlatform === 'android'
                      ? "Android"
                      : "different"}{" "}
                    device. Kull AI is currently available for macOS and iOS devices only.{" "}
                    {(detectedPlatform === 'windows' || detectedPlatform === 'android') && (
                      <>Support for {detectedPlatform === 'windows' ? 'Windows' : 'Android'} is coming soon!</>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Additional notes */}
        <div className="mt-8 space-y-4">
          <h3 className="font-bold text-foreground">Additional Notes:</h3>
          <ul className="space-y-2 text-muted-foreground">
            {platform === 'macos' ? (
              <>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Universal app optimized for both Apple Silicon and Intel Macs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Works with any folder on your Mac - no special setup required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Supports RAW and JPEG formats from all major camera brands</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Optimized for both iPhone and iPad</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Seamlessly syncs with your Mac app via iCloud</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Offline mode support for rating photos on the go</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

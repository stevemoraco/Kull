import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2 } from "lucide-react";

interface InstallInstructionsProps {
  platform: 'macos' | 'ios';
}

export function InstallInstructions({ platform }: InstallInstructionsProps) {
  const macosSteps = [
    {
      title: "Download the installer",
      description: "Click the download button above to get Kull-1.0.0.dmg file.",
    },
    {
      title: "Open the downloaded file",
      description: "Locate the DMG file in your Downloads folder and double-click to open it.",
    },
    {
      title: "Drag to Applications",
      description: "Drag the Kull.app icon to your Applications folder in the Finder window.",
    },
    {
      title: "Launch Kull",
      description: "Open Applications folder and double-click Kull to launch the app.",
    },
    {
      title: "Grant permissions (if needed)",
      description: "If you see a security prompt about an unidentified developer, go to System Preferences → Security & Privacy → click 'Open Anyway'.",
    },
    {
      title: "Sign in to your account",
      description: "Enter your Kull AI credentials to start using the app. Your settings will sync across all devices.",
    },
  ];

  const iosSteps = [
    {
      title: "Open the App Store",
      description: "Tap the App Store icon on your home screen or click the 'Get on App Store' button above.",
    },
    {
      title: "Download Kull AI",
      description: "Tap 'Get' or the download icon, then authenticate with Face ID, Touch ID, or your password.",
    },
    {
      title: "Wait for installation",
      description: "The app will download and install automatically. You'll see the Kull icon on your home screen when ready.",
    },
    {
      title: "Open the app",
      description: "Tap the Kull icon to launch the app for the first time.",
    },
    {
      title: "Grant permissions",
      description: "Allow Kull to access your Photos library when prompted. This is required to rate and organize your photos.",
    },
    {
      title: "Sign in to your account",
      description: "Enter your Kull AI credentials. Your ratings and settings will sync with your Mac and other devices.",
    },
  ];

  const steps = platform === 'macos' ? macosSteps : iosSteps;

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center text-foreground">
          Installation Instructions
        </h2>
        <p className="text-muted-foreground text-center mb-8 text-lg">
          Follow these simple steps to get started with Kull AI on {platform === 'macos' ? 'macOS' : 'iOS'}
        </p>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <Accordion type="single" collapsible key={index} defaultValue={index === 0 ? `item-${index}` : undefined}>
              <AccordionItem value={`item-${index}`} className="bg-card border border-card-border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-4 text-left">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-card-foreground">{step.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="flex gap-4 pl-12">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>

        <div className="mt-8 p-6 bg-primary/10 border border-primary/20 rounded-lg">
          <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Need Help?
          </h3>
          <p className="text-muted-foreground">
            If you encounter any issues during installation, please visit our{" "}
            <a href="/support" className="text-primary hover:underline">
              support page
            </a>{" "}
            or contact us directly. We're here to help!
          </p>
        </div>
      </div>
    </section>
  );
}

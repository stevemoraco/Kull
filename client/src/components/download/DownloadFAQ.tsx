import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function DownloadFAQ() {
  const faqs = [
    {
      question: "Is Kull AI free to use?",
      answer:
        "Kull AI offers a 1-day unlimited free trial so you can experience the full power of AI photo culling. After the trial, you'll need an active subscription to continue using the app. Choose between our Professional ($99/month) or Studio ($499/month) plans.",
    },
    {
      question: "Which cameras and file formats are supported?",
      answer:
        "Kull AI works with photos from any camera! We support both RAW and JPEG formats from all major camera brands including Canon, Nikon, Sony, Fujifilm, Olympus, Panasonic, and more. The app analyzes your photos regardless of the camera used to capture them.",
    },
    {
      question: "How does AI culling work?",
      answer:
        "Kull AI uses 5 advanced AI models (Gemini, Grok, Kimi k2, Claude, and GPT-5) to analyze your photos. Each model evaluates composition, sharpness, exposure, emotion, and technical quality. The app then aggregates these ratings to give you an objective quality score for each photo, helping you quickly identify your best shots.",
    },
    {
      question: "Can I use my own custom prompts?",
      answer:
        "Yes! Kull AI includes a prompt marketplace where you can discover and use community-created prompts, or create your own custom rating criteria. This lets you tailor the AI analysis to your specific photography style and client needs.",
    },
    {
      question: "Is my data secure and private?",
      answer:
        "Absolutely. Your photos are processed securely and we never store your original images on our servers. All photo analysis happens through encrypted connections, and your data is protected according to industry-standard security practices. We take your privacy seriously.",
    },
    {
      question: "Do you support Windows or Android?",
      answer:
        "Currently, Kull AI is available exclusively for macOS and iOS/iPadOS devices. We're actively working on Windows and Android versions and they're on our roadmap for future releases. Sign up for our newsletter to be notified when these versions become available.",
    },
    {
      question: "How do I get support if I need help?",
      answer:
        "We offer multiple support channels! You can use the in-app support chat (available 24/7), visit our support page, or email us directly. Professional plan users get email support, while Studio plan users receive priority 24/7 support with a dedicated account manager.",
    },
    {
      question: "Can I use Kull AI offline?",
      answer:
        "The iOS app includes offline mode support, allowing you to rate photos when you don't have an internet connection. Your ratings will sync automatically when you're back online. The Mac app requires an internet connection for AI processing.",
    },
    {
      question: "How many devices can I use?",
      answer:
        "Your subscription includes access across all your devices! Install Kull AI on your Mac, iPhone, and iPad - everything syncs automatically via iCloud. Studio plan users can share access with up to 5 team members.",
    },
    {
      question: "What happens after my trial ends?",
      answer:
        "After your 1-day trial, you'll need to select a subscription plan to continue using Kull AI. All your ratings and settings are preserved, so you can pick up right where you left off. You can choose monthly or annual billing, and cancel anytime.",
    },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about downloading and using Kull AI
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-card-border rounded-lg"
            >
              <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                <span className="font-semibold text-card-foreground pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <a
            href="/support"
            className="text-primary hover:underline font-semibold"
          >
            Contact our support team
          </a>
        </div>
      </div>
    </section>
  );
}

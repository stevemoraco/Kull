import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const faqs = [
    {
      question: "How does the 1-day free trial work?",
      answer: "Sign up and get unlimited access to Kull AI for 24 hours. Rate as many photos as you want during your trial. After entering your payment details, you can cancel anytime during the trial period with no charge. If you don't cancel, your subscription starts after 24 hours."
    },
    {
      question: "What's the 24-hour special offer?",
      answer: "When you sign up, you'll have 24 hours to subscribe and receive 3 extra months free on any annual plan. That's a total of 15 months for the price of 12—saving you hundreds of dollars."
    },
    {
      question: "Which plan is right for me?",
      answer: "The Professional plan ($99/mo) is perfect for individual photographers rating their own work. The Studio plan ($499/mo) is ideal for teams, studios, or high-volume photographers who need priority processing, team collaboration, and advanced features."
    },
    {
      question: "How does the app work?",
      answer: "Kull AI is a universal Mac/iPhone/iPad app that works with any folder on your Mac. Download the Mac app, point it to your photo folders, and the AI instantly rates, organizes, titles, describes, tags, and color-codes your images. Continue organizing on your iPhone or iPad with automatic sync across all devices."
    },
    {
      question: "How accurate are the AI ratings?",
      answer: "Kull AI uses 5 different AI models (Gemini, Grok, Groq, Claude, and OpenAI) working together to analyze composition, exposure, focus, and artistic merit. The consensus rating from multiple models provides professional-level accuracy that improves with every update."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely. Cancel your subscription at any time from your account dashboard. No questions asked, no cancellation fees. You'll retain access until the end of your current billing period."
    },
    {
      question: "What about the referral bonuses?",
      answer: "Refer other photographers during signup or checkout and unlock bonuses: 1 referral = bonus feature, 3 referrals = 1 month free, 5 referrals = priority support upgrade, 10 referrals = 3 months free. Share with your photography network and stack rewards!"
    },
    {
      question: "Is my data secure?",
      answer: "Yes. We never store your actual photos—only the ratings data. All processing happens securely, and we use industry-standard encryption. Your creative work stays yours, always."
    }
  ];

  return (
    <section className="py-20 md:py-32 px-4" data-testid="section-faq">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground" data-testid="text-faq-headline">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Kull AI
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-card-border rounded-xl px-6 data-testid-accordion-item"
              data-testid={`accordion-faq-${index}`}
            >
              <AccordionTrigger className="text-left font-semibold text-card-foreground hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

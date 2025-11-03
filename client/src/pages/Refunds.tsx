import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowLeft, CheckCircle, AlertCircle, Mic, Square } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Refunds() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'survey' | 'success'>('info');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);
  
  // Survey form state
  const [primaryReason, setPrimaryReason] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [missingFeature, setMissingFeature] = useState("");
  const [technicalIssues, setTechnicalIssues] = useState("");
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak your feedback clearly. Click stop when done.",
      });
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice feedback.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'feedback.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      setAdditionalFeedback(prev => prev ? `${prev}\n\n[Voice feedback]: ${data.text}` : `[Voice feedback]: ${data.text}`);
      
      toast({
        title: "Transcription Complete",
        description: "Your voice feedback has been added to the form.",
      });
    } catch (error) {
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe audio. Please type your feedback instead.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmitSurvey = async () => {
    if (!primaryReason) {
      toast({
        title: "Please Complete Survey",
        description: "Please answer the primary reason for your refund request.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to request a refund",
        variant: "destructive",
      });
      window.location.href = "/api/login";
      return;
    }

    setIsProcessing(true);
    try {
      // Submit survey and process refund
      const result = await apiRequest("POST", "/api/refund/request", {
        primaryReason,
        wouldRecommend,
        missingFeature,
        technicalIssues,
        additionalFeedback,
      });
      
      setRefundResult(result);
      setStep('success');
      
      toast({
        title: "Refund Processed",
        description: "Thank you for your feedback. Your refund has been processed successfully.",
      });
    } catch (error: any) {
      const errorMessage = error.detail || error.message || "Failed to process refund";
      toast({
        title: "Refund Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setRefundResult({ error: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Kull AI</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <DollarSign className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" data-testid="text-refunds-headline">
              Refund Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: November 3, 2025
            </p>
          </div>

          {/* Survey Form for Logged In Users */}
          {user && step === 'survey' && (
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-foreground">Help Us Improve - Quick Survey</h2>
              <p className="text-muted-foreground mb-6">
                Before we process your refund, we'd love to understand what didn't work for you. 
                Your feedback helps us improve Kull AI for future photographers.
              </p>

              <div className="space-y-6">
                {/* Question 1: Primary Reason */}
                <div>
                  <Label htmlFor="primary-reason" className="text-base font-semibold mb-3 block">
                    1. What's the main reason you're requesting a refund? *
                  </Label>
                  <RadioGroup value={primaryReason} onValueChange={setPrimaryReason}>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="too-expensive" id="too-expensive" data-testid="radio-too-expensive" />
                      <Label htmlFor="too-expensive" className="font-normal cursor-pointer">
                        Too expensive for my needs
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="missing-features" id="missing-features" data-testid="radio-missing-features" />
                      <Label htmlFor="missing-features" className="font-normal cursor-pointer">
                        Missing features I needed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="technical-issues" id="technical-issues" data-testid="radio-technical-issues" />
                      <Label htmlFor="technical-issues" className="font-normal cursor-pointer">
                        Technical problems or bugs
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="not-as-described" id="not-as-described" data-testid="radio-not-as-described" />
                      <Label htmlFor="not-as-described" className="font-normal cursor-pointer">
                        Product wasn't as described
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" data-testid="radio-other" />
                      <Label htmlFor="other" className="font-normal cursor-pointer">
                        Other reason
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Question 2: Would Recommend */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    2. Would you recommend Kull AI to other photographers?
                  </Label>
                  <RadioGroup value={wouldRecommend === null ? "" : wouldRecommend.toString()} 
                              onValueChange={(val) => setWouldRecommend(val === "true")}>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="true" id="recommend-yes" data-testid="radio-recommend-yes" />
                      <Label htmlFor="recommend-yes" className="font-normal cursor-pointer">
                        Yes, despite this issue
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="recommend-no" data-testid="radio-recommend-no" />
                      <Label htmlFor="recommend-no" className="font-normal cursor-pointer">
                        No, not in its current state
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Question 3: Missing Feature */}
                <div>
                  <Label htmlFor="missing-feature" className="text-base font-semibold mb-3 block">
                    3. What feature or capability were you hoping to find in Kull AI?
                  </Label>
                  <Textarea
                    id="missing-feature"
                    value={missingFeature}
                    onChange={(e) => setMissingFeature(e.target.value)}
                    placeholder="e.g., Support for video rating, batch export, specific AI model, etc."
                    className="min-h-[100px]"
                    data-testid="textarea-missing-feature"
                  />
                </div>

                {/* Question 4: Technical Issues */}
                <div>
                  <Label htmlFor="technical-issues" className="text-base font-semibold mb-3 block">
                    4. Did you experience any technical issues or bugs?
                  </Label>
                  <Textarea
                    id="technical-issues"
                    value={technicalIssues}
                    onChange={(e) => setTechnicalIssues(e.target.value)}
                    placeholder="e.g., Installation problems, crashes, slow performance, Lightroom integration issues, etc."
                    className="min-h-[100px]"
                    data-testid="textarea-technical-issues"
                  />
                </div>

                {/* Question 5: Additional Feedback with Voice Transcription */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="additional-feedback" className="text-base font-semibold">
                      5. Any other feedback you'd like to share?
                    </Label>
                    <div className="flex gap-2">
                      {!isRecording && !isTranscribing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={startRecording}
                          className="gap-2"
                          data-testid="button-start-recording"
                        >
                          <Mic className="w-4 h-4" />
                          Voice Feedback
                        </Button>
                      )}
                      {isRecording && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={stopRecording}
                          className="gap-2 animate-pulse"
                          data-testid="button-stop-recording"
                        >
                          <Square className="w-4 h-4" />
                          Stop Recording
                        </Button>
                      )}
                      {isTranscribing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled
                          className="gap-2"
                        >
                          Transcribing...
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    id="additional-feedback"
                    value={additionalFeedback}
                    onChange={(e) => setAdditionalFeedback(e.target.value)}
                    placeholder="Anything else we should know? You can type here or use the voice feedback button above."
                    className="min-h-[120px]"
                    data-testid="textarea-additional-feedback"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => setStep('info')}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-back-to-info"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitSurvey}
                    disabled={isProcessing || !primaryReason}
                    className="flex-1"
                    data-testid="button-submit-survey"
                  >
                    {isProcessing ? 'Processing...' : 'Submit & Process Refund'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Success Message */}
          {user && step === 'success' && refundResult && !refundResult.error && (
            <Alert className="bg-green-500/10 border-green-500/20 mb-8">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                <div className="space-y-2">
                  <p className="font-semibold">Refund Processed Successfully!</p>
                  <p>Amount: ${(refundResult.refund.amount / 100).toFixed(2)}</p>
                  <p className="text-sm">You will see the credit in your account within 5-7 business days.</p>
                  <p className="text-sm mt-4">Thank you for your valuable feedback. We'll use it to improve Kull AI!</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Refund Request Button for Logged In Users */}
          {user && step === 'info' && (
            <section className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Request Instant Refund</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Within 7 days of your first payment, you can request an instant refund. We just need a few minutes of your time to understand what didn't work for you.
              </p>
              <Button
                onClick={() => setStep('survey')}
                size="lg"
                className="w-full sm:w-auto"
                data-testid="button-start-refund"
              >
                Start Refund Request
              </Button>
            </section>
          )}

          {/* Error Display */}
          {refundResult && refundResult.error && (
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{refundResult.error}</AlertDescription>
            </Alert>
          )}

          {/* Policy Content */}
          <div className="prose prose-lg max-w-none space-y-8">
            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Our Commitment to Satisfaction</h2>
              <p className="text-muted-foreground leading-relaxed">
                We want you to love Kull AI. That's why we offer a generous 1-day free trial and a fair refund policy for new subscribers.
              </p>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Free Trial Period</h2>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-4">
                <p className="text-foreground font-semibold mb-2">24-Hour Trial - Zero Risk</p>
                <p className="text-muted-foreground leading-relaxed">
                  All new users receive a full 24-hour trial period. You can cancel anytime during this period with absolutely no charge. This is your risk-free opportunity to test Kull AI with your own photos.
                </p>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">7-Day Money-Back Guarantee</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you're not satisfied with Kull AI after your trial ends, we offer a 7-day money-back guarantee on your first payment:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Request a refund within 7 days of your first payment</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Applies to both monthly and annual subscriptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Full refund after completing a quick feedback survey</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Processed within 5-7 business days</span>
                </li>
              </ul>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">How to Request a Refund</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Sign In</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Make sure you're logged into your account.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Complete Quick Survey</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Answer 3-5 questions about your experience (takes 2 minutes). You can type or use voice feedback.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Receive Instant Refund</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Your refund will be processed instantly and you'll see the credit in 5-7 business days.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-card border border-card-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Need Help?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Have questions about our refund policy? Use our chat support on any page for instant help.
              </p>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground font-semibold">Lander Media</p>
                <p className="text-muted-foreground">31 N Tejon St</p>
                <p className="text-muted-foreground">Colorado Springs, CO 80903</p>
                <p className="text-muted-foreground mt-2">
                  Founded 2014
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

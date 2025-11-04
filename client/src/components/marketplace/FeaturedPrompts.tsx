import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, Award } from "lucide-react";
import type { PromptTemplate } from "@shared/types/marketplace";
import { useLocation } from "wouter";

interface FeaturedPromptsProps {
  prompts: PromptTemplate[];
}

export function FeaturedPrompts({ prompts }: FeaturedPromptsProps) {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (prompts.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % prompts.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [prompts.length]);

  if (prompts.length === 0) return null;

  const currentPrompt = prompts[currentIndex];
  const qualityScore = parseFloat(currentPrompt.qualityScore);
  const stars = Math.round(qualityScore * 5);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % prompts.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + prompts.length) % prompts.length);
  };

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Featured Prompts</h2>
      </div>

      <div className="relative">
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-start justify-between mb-4">
                <Badge variant="default" className="mb-2">Featured</Badge>
              </div>

              <h3 className="text-3xl font-bold text-foreground mb-3">
                {currentPrompt.name}
              </h3>

              <p className="text-muted-foreground mb-6 text-lg">
                {currentPrompt.description}
              </p>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  <span className="font-semibold">{stars}/5</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentPrompt.voteCount} votes
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentPrompt.usageCount} uses
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {currentPrompt.tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => setLocation(`/marketplace/${currentPrompt.id}`)}
              >
                View Details
              </Button>
            </div>

            <div className="bg-card/50 rounded-lg p-6 border border-border">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                System Prompt Preview
              </h4>
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono overflow-hidden line-clamp-[12]">
                {currentPrompt.systemPrompt}
              </pre>
            </div>
          </div>
        </Card>

        {prompts.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <div className="flex justify-center gap-2 mt-4">
              {prompts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-primary w-6'
                      : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

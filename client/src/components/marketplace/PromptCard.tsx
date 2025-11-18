import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, User } from "lucide-react";
import type { PromptTemplate } from "@shared/types/marketplace";
import { useLocation } from "wouter";

interface PromptCardProps {
  prompt: PromptTemplate;
}

const profileColors: Record<string, string> = {
  wedding: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  portrait: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  sports: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  corporate: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  product: "bg-green-500/10 text-green-500 border-green-500/20",
  'real-estate': "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  standard: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function PromptCard({ prompt }: PromptCardProps) {
  const [, setLocation] = useLocation();

  const qualityScore = parseFloat(prompt.qualityScore);
  const stars = Math.round(qualityScore * 5); // Convert 0-1 to 0-5 stars

  return (
    <Card
      className="p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-card-border"
      onClick={() => setLocation(`/marketplace/${prompt.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-card-foreground mb-1 line-clamp-1">
            {prompt.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <User className="w-4 h-4" />
            <span>{prompt.authorName || 'Unknown'}</span>
          </div>
        </div>
        {prompt.isFeatured && (
          <Badge variant="default" className="ml-2">Featured</Badge>
        )}
      </div>

      <Badge
        variant="outline"
        className={`mb-3 ${profileColors[prompt.profile] || profileColors.standard}`}
      >
        {prompt.profile}
      </Badge>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {prompt.description}
      </p>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
          <span>{stars}/5</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          <span>{prompt.voteCount} votes</span>
        </div>
        <div className="text-xs">
          {prompt.usageCount} uses
        </div>
      </div>

      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {prompt.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs"
            >
              {tag}
            </Badge>
          ))}
          {prompt.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{prompt.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      <Button
        className="w-full"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          setLocation(`/marketplace/${prompt.id}`);
        }}
      >
        View Details
      </Button>
    </Card>
  );
}

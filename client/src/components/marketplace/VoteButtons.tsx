import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePromptVote } from "@/hooks/usePromptVote";

interface VoteButtonsProps {
  promptId: string;
  initialVote?: number;
  onVoteChange?: () => void;
}

export function VoteButtons({ promptId, initialVote, onVoteChange }: VoteButtonsProps) {
  const { isAuthenticated } = useAuth();
  const { vote, isVoting, submitVote } = usePromptVote(promptId, initialVote);

  const handleVote = async (value: 1 | -1) => {
    await submitVote(value);
    if (onVoteChange) {
      onVoteChange();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-border">
        <LogIn className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Login to vote on prompts
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.href = '/api/login'}
          className="ml-auto"
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={vote === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className="gap-2"
      >
        <ThumbsUp className="w-4 h-4" />
        Upvote
      </Button>
      <Button
        variant={vote === -1 ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className="gap-2"
      >
        <ThumbsDown className="w-4 h-4" />
        Downvote
      </Button>
    </div>
  );
}

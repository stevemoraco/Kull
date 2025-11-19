import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  User,
  TrendingUp,
  Star,
  Copy,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { getPrompt, deletePrompt, incrementPromptUsage } from "@/api/prompts";
import { VoteButtons } from "@/components/marketplace/VoteButtons";
import { EditPromptModal } from "@/components/marketplace/EditPromptModal";
import { Footer } from "@/components/Footer";
import type { PromptTemplate } from "@shared/types/marketplace";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PromptDetail() {
  usePageTracking('prompt-detail');
  const [match, params] = useRoute("/marketplace/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [prompt, setPrompt] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const promptId = params?.id || "";

  useEffect(() => {
    if (promptId) {
      loadPrompt();
    }
  }, [promptId]);

  const loadPrompt = async () => {
    try {
      setLoading(true);
      const data = await getPrompt(promptId);
      setPrompt(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load prompt",
        variant: "destructive",
      });
      setLocation("/marketplace");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (prompt) {
      navigator.clipboard.writeText(prompt.systemPrompt);
      toast({
        title: "Copied!",
        description: "System prompt copied to clipboard",
      });
    }
  };

  const handleUsePrompt = async () => {
    if (prompt) {
      await incrementPromptUsage(prompt.id);
      toast({
        title: "Success",
        description: "Usage count incremented. Copy the prompt to use it!",
      });
      handleCopyPrompt();
    }
  };

  const handleDelete = async () => {
    if (!prompt) return;

    try {
      await deletePrompt(prompt.id);
      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });
      setLocation("/marketplace");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prompt",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading prompt...</p>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Prompt not found</p>
      </div>
    );
  }

  const isAuthor = user?.id === prompt.authorId;
  const qualityScore = prompt.qualityScore;
  const stars = Math.round(qualityScore * 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/marketplace")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Marketplace</span>
          </button>

          {isAuthor && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  {prompt.name}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{prompt.authorName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span>{stars}/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>{prompt.voteCount} votes</span>
                  </div>
                  <span>{prompt.usageCount} uses</span>
                </div>
              </div>
              {prompt.isFeatured && (
                <Badge variant="default">Featured</Badge>
              )}
            </div>

            <Badge variant="outline" className="mb-4">
              {prompt.profile}
            </Badge>

            <p className="text-lg text-muted-foreground mb-6">
              {prompt.description}
            </p>

            {prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {prompt.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Vote Buttons */}
            <div className="mb-6">
              <VoteButtons
                promptId={prompt.id}
                initialVote={prompt.userVote}
                onVoteChange={loadPrompt}
              />
            </div>
          </div>

          {/* System Prompt */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-card-foreground">
                System Prompt
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPrompt}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button size="sm" onClick={handleUsePrompt}>
                  <Download className="w-4 h-4 mr-2" />
                  Use This Prompt
                </Button>
              </div>
            </div>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {prompt.systemPrompt}
            </pre>
          </Card>

          {/* First Message */}
          {prompt.firstMessage && (
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold text-card-foreground mb-4">
                First Message
              </h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {prompt.firstMessage}
              </p>
            </Card>
          )}

          {/* Sample Output */}
          {prompt.sampleOutput && (
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold text-card-foreground mb-4">
                Sample Output
              </h2>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                {prompt.sampleOutput}
              </pre>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isAuthor && (
        <EditPromptModal
          prompt={prompt}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={loadPrompt}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your prompt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

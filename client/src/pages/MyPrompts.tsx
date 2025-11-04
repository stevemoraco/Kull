import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ArrowLeft, TrendingUp, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { usePrompts } from "@/hooks/usePrompts";
import { useLocation } from "wouter";
import { Footer } from "@/components/Footer";
import { PromptCard } from "@/components/marketplace/PromptCard";
import { CreatePromptModal } from "@/components/marketplace/CreatePromptModal";

export default function MyPrompts() {
  usePageTracking('my-prompts');
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { prompts, loading, refetch } = usePrompts({
    authorId: user?.id,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your prompts
          </p>
          <Button onClick={() => window.location.href = '/api/login'}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const totalUses = prompts.reduce((sum, p) => sum + p.usageCount, 0);
  const totalVotes = prompts.reduce((sum, p) => sum + p.voteCount, 0);
  const avgScore = prompts.length > 0
    ? prompts.reduce((sum, p) => sum + parseFloat(p.qualityScore), 0) / prompts.length
    : 0;

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

          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Prompt
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              My Prompts
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your AI culling prompts and track their performance
            </p>
          </div>

          {/* Analytics Cards */}
          {prompts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Total Uses
                  </h3>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold text-foreground">{totalUses}</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Total Votes
                  </h3>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold text-foreground">{totalVotes}</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Average Score
                  </h3>
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {Math.round(avgScore * 5)}/5
                </p>
              </Card>
            </div>
          )}

          {/* Prompt Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your prompts...</p>
              </div>
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground mb-4">
                You haven't created any prompts yet
              </p>
              <p className="text-muted-foreground mb-6">
                Create your first prompt to share with the community!
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Prompt
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prompts.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Prompt Modal */}
      <CreatePromptModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={refetch}
      />

      <Footer />
    </div>
  );
}

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { usePrompts } from "@/hooks/usePrompts";
import { Footer } from "@/components/Footer";
import { PromptCard } from "@/components/marketplace/PromptCard";
import { PromptFilters } from "@/components/marketplace/PromptFilters";
import { PromptSearchBar } from "@/components/marketplace/PromptSearchBar";
import { FeaturedPrompts } from "@/components/marketplace/FeaturedPrompts";
import { CreatePromptModal } from "@/components/marketplace/CreatePromptModal";
import type { PromptSearchFilters } from "@shared/types/marketplace";

export default function Marketplace() {
  usePageTracking('marketplace');
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<PromptSearchFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { prompts, loading, refetch } = usePrompts({
    ...filters,
    query: searchQuery,
  });

  // Get all unique tags from prompts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    prompts.forEach(prompt => {
      prompt.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [prompts]);

  const featuredPrompts = prompts.filter(p => p.isFeatured);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2 transition-all"
          >
            <img src="/kull-logo.png" alt="Kull Logo" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-black text-foreground">Kull</span>
          </button>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Prompt
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => window.location.href = "/api/login"}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
              Discover AI Culling Prompts
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Browse community-shared prompts for every photography style. Find the perfect AI assistant for your workflow.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <PromptSearchBar
                onSearchChange={setSearchQuery}
                resultCount={prompts.length}
              />
            </div>
          </div>

          {/* Featured Prompts */}
          {featuredPrompts.length > 0 && (
            <FeaturedPrompts prompts={featuredPrompts} />
          )}

          {/* Filters */}
          <PromptFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableTags={allTags}
          />

          {/* Prompt Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading prompts...</p>
              </div>
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground mb-4">
                No prompts found
              </p>
              <p className="text-muted-foreground mb-6">
                Be the first to create a prompt for the community!
              </p>
              {isAuthenticated && (
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Prompt
                </Button>
              )}
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

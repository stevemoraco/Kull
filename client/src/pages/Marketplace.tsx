import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptPreset } from "@shared/culling/schemas";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Filter, ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";

const PROMPTS_QUERY_KEY = "prompts";
const MY_PROMPTS_QUERY_KEY = "prompts:mine";

type SortOption = "top-rated" | "most-popular" | "recent";

type PromptMetaResponse = {
  created: PromptPreset[];
  saved: PromptPreset[];
};

async function fetchPrompts(search: string): Promise<PromptPreset[]> {
  const url = search ? `/api/prompts?search=${encodeURIComponent(search)}` : "/api/prompts";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Unable to load prompts (${res.status})`);
  }
  return res.json();
}

async function fetchMyPromptMeta(): Promise<PromptMetaResponse> {
  const res = await fetch("/api/prompts/my", { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Unable to load personal prompts (${res.status})`);
  }
  return res.json();
}

function getAuthorInitials(authorEmail?: string) {
  if (!authorEmail) return "?";
  return authorEmail.charAt(0).toUpperCase();
}

function getPrimaryScore(prompt: PromptPreset): number {
  if (prompt.humanScore != null) return prompt.humanScore;
  if (prompt.aiScore != null) return prompt.aiScore;
  return 0;
}

const SORT_OPTIONS: { value: SortOption; label: string; description: string }[] = [
  { value: "top-rated", label: "Top rated", description: "Highest human/AI scores first" },
  { value: "most-popular", label: "Most popular", description: "Sorted by total ratings" },
  { value: "recent", label: "Recently updated", description: "Newest marketplace prompts first" },
];

function sortPrompts(data: PromptPreset[], sort: SortOption) {
  const copy = [...data];
  switch (sort) {
    case "top-rated":
      return copy.sort((a, b) => getPrimaryScore(b) - getPrimaryScore(a));
    case "most-popular":
      return copy.sort((a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0));
    case "recent":
      return copy.sort((a, b) => {
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bDate - aDate;
      });
    default:
      return copy;
  }
}

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("top-rated");
  const [detailPrompt, setDetailPrompt] = useState<PromptPreset | null>(null);
  const deferredSearch = useDeferredValue(searchTerm.trim());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prompts, isLoading, error } = useQuery({
    queryKey: [PROMPTS_QUERY_KEY, deferredSearch],
    queryFn: () => fetchPrompts(deferredSearch),
    keepPreviousData: true,
  });

  const { data: myPrompts } = useQuery({
    queryKey: [MY_PROMPTS_QUERY_KEY],
    queryFn: fetchMyPromptMeta,
  });

  const savedSlugs = useMemo(() => {
    return new Set(myPrompts?.saved?.map((prompt) => prompt.slug) ?? []);
  }, [myPrompts?.saved]);

  const availableTags = useMemo(() => {
    const map = new Map<string, number>();
    const source = prompts ?? [];
    source.forEach((prompt) => {
      [...(prompt.tags ?? []), ...(prompt.shootTypes ?? [])].forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    let result = prompts;
    if (selectedTag) {
      result = result.filter(
        (prompt) =>
          prompt.tags?.includes(selectedTag) || prompt.shootTypes?.includes(selectedTag),
      );
    }
    return sortPrompts(result, sortOption);
  }, [prompts, selectedTag, sortOption]);

  const voteMutation = useMutation({
    mutationFn: async ({ slug, value }: { slug: string; value: "up" | "down" }) => {
      const res = await apiRequest("POST", `/api/prompts/${slug}/vote`, { value });
      return res.json() as Promise<PromptPreset>;
    },
    onSuccess: (updatedPrompt) => {
      queryClient.setQueryData<PromptPreset[] | undefined>(
        [PROMPTS_QUERY_KEY, deferredSearch],
        (prev) => prev?.map((prompt) => (prompt.slug === updatedPrompt.slug ? updatedPrompt : prompt)),
      );
      toast({
        title: "Thanks for the feedback",
        description: "Your vote helps photographers surface the best presets.",
      });
    },
    onError: () => {
      toast({
        title: "Vote failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ slug }: { slug: string }) => {
      const res = await apiRequest("POST", `/api/prompts/${slug}/save`);
      return res.json() as Promise<{ saved: boolean }>;
    },
    onSuccess: ({ saved }, { slug }) => {
      queryClient.setQueryData<PromptMetaResponse | undefined>([MY_PROMPTS_QUERY_KEY], (prev) => {
        if (!prev) return prev;
        const isSaved = prev.saved.some((prompt) => prompt.slug === slug);
        if (saved && !isSaved) {
          const prompt = (queryClient.getQueryData<PromptPreset[]>([PROMPTS_QUERY_KEY, deferredSearch]) ?? []).find((item) => item.slug === slug);
          return prompt
            ? { ...prev, saved: [...prev.saved, prompt] }
            : prev;
        }
        if (!saved) {
          return { ...prev, saved: prev.saved.filter((prompt) => prompt.slug !== slug) };
        }
        return prev;
      });
      toast({
        title: saved ? "Prompt saved" : "Prompt removed",
        description: saved ? "Find this preset anytime under your saved collection." : "Removed from your saved prompts.",
      });
    },
    onError: () => {
      toast({
        title: "Unable to update favorites",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleVote = (prompt: PromptPreset, value: "up" | "down") => {
    voteMutation.mutate({ slug: prompt.slug, value });
  };

  const handleToggleSave = (prompt: PromptPreset) => {
    saveMutation.mutate({ slug: prompt.slug });
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  const isEmpty = !isLoading && filteredPrompts.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10">
          <div className="flex items-center gap-3 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Prompt marketplace</span>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground md:text-4xl">
                Discover ready-to-run culling presets
              </h1>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                Browse photographer-tested prompt presets, vote on what works, and favorite the sets you want to run next.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:w-72">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search prompts or creators"
                  className="pr-10"
                />
                <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    Sort: {SORT_OPTIONS.find((item) => item.value === sortOption)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <DropdownMenuLabel>Sort prompts</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={sortOption}
                    onValueChange={(value) => setSortOption(value as SortOption)}
                  >
                    {SORT_OPTIONS.map((item) => (
                      <DropdownMenuRadioItem key={item.value} value={item.value}>
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableTags.map(([tag, count]) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "secondary"}
                  onClick={() => handleTagClick(tag)}
                  className="cursor-pointer flex items-center gap-1"
                >
                  <span>{tag}</span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </Badge>
              ))}
              {selectedTag && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTag(null)}>
                  Clear filter
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-12">
        {isLoading ? (
          <MarketplaceSkeleton />
        ) : error ? (
          <ErrorState message={(error as Error).message} />
        ) : isEmpty ? (
          <EmptyState selectedTag={selectedTag} searchTerm={deferredSearch} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPrompts.map((prompt) => (
              <PromptCard
                key={prompt.slug}
                prompt={prompt}
                saved={savedSlugs.has(prompt.slug)}
                onOpenDetail={() => setDetailPrompt(prompt)}
                onSave={() => handleToggleSave(prompt)}
                onVoteUp={() => handleVote(prompt, "up")}
                onVoteDown={() => handleVote(prompt, "down")}
                isSaving={saveMutation.isPending}
                isVoting={voteMutation.isPending}
              />
            ))}
          </div>
        )}
      </main>

      <PromptDetailDialog prompt={detailPrompt} onClose={() => setDetailPrompt(null)} />
    </div>
  );
}

function MarketplaceSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="border-border/60">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-2 h-4 w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-6 w-12" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/40 bg-destructive/10 px-12 py-16 text-center">
      <p className="text-lg font-medium text-destructive-foreground">Something went wrong.</p>
      <p className="max-w-xl text-sm text-destructive-foreground/70">{message}</p>
      <p className="text-xs text-muted-foreground">
        Prompts are still available in the desktop app. Try refreshing the page to load them here.
      </p>
    </div>
  );
}

function EmptyState({ selectedTag, searchTerm }: { selectedTag: string | null; searchTerm: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/60 px-12 py-16 text-center">
      <h2 className="text-xl font-semibold text-foreground">No prompts match your filters yet.</h2>
      <p className="max-w-lg text-sm text-muted-foreground">
        {selectedTag
          ? `We don't have any prompts tagged “${selectedTag}” just yet. Try clearing the filter to see all presets.`
          : searchTerm
            ? `We couldn't find prompts matching “${searchTerm}”. Try searching for a different theme or photographer.`
            : "Check back soon for new presets from the community."}
      </p>
    </div>
  );
}

type PromptCardProps = {
  prompt: PromptPreset;
  saved: boolean;
  isSaving: boolean;
  isVoting: boolean;
  onOpenDetail: () => void;
  onSave: () => void;
  onVoteUp: () => void;
  onVoteDown: () => void;
};

function PromptCard({ prompt, saved, isSaving, isVoting, onOpenDetail, onSave, onVoteUp, onVoteDown }: PromptCardProps) {
  const score = getPrimaryScore(prompt);
  const author = prompt.authorProfile;
  return (
    <Card className="flex h-full flex-col justify-between border-border/80 shadow-sm transition hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">{prompt.title}</CardTitle>
            <CardDescription className="mt-2 text-sm text-muted-foreground">{prompt.summary}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onSave} disabled={isSaving}>
            {saved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Avatar className="h-8 w-8">
            {author.avatarUrl ? (
              <AvatarImage src={author.avatarUrl} alt={author.displayName ?? author.email ?? "Creator"} />
            ) : (
              <AvatarFallback>{getAuthorInitials(author.displayName ?? author.email)}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <div className="text-sm font-medium text-foreground">{author.displayName ?? author.email ?? "Marketplace Creator"}</div>
            <div className="text-xs text-muted-foreground">{author.email}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(prompt.tags ?? []).slice(0, 6).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {(prompt.shootTypes ?? []).slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-foreground">{score ? score.toFixed(1) : "New"}</span>
          {prompt.humanScore != null && <span className="text-xs text-muted-foreground">Human score</span>}
          {prompt.humanScore == null && prompt.aiScore != null && <span className="text-xs text-muted-foreground">AI score</span>}
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-muted-foreground">{prompt.ratingsCount} vote{prompt.ratingsCount === 1 ? "" : "s"}</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onOpenDetail}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View details
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onVoteUp} disabled={isVoting}>
            <ThumbsUp className="mr-1 h-4 w-4" /> Upvote
          </Button>
          <Button variant="ghost" size="sm" onClick={onVoteDown} disabled={isVoting}>
            <ThumbsDown className="mr-1 h-4 w-4" /> Pass
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

type PromptDetailDialogProps = {
  prompt: PromptPreset | null;
  onClose: () => void;
};

function PromptDetailDialog({ prompt, onClose }: PromptDetailDialogProps) {
  const open = prompt != null;
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        {prompt && (
          <ScrollArea className="max-h-[75vh] pr-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">{prompt.title}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Created by {prompt.authorProfile.displayName ?? prompt.authorProfile.email ?? "Photographer"}
              </DialogDescription>
            </DialogHeader>

            <section className="mt-6 space-y-3">
              <h3 className="font-semibold text-foreground">Summary</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{prompt.summary}</p>
            </section>

            <section className="mt-6 space-y-3">
              <h3 className="font-semibold text-foreground">Instructions</h3>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm text-muted-foreground">{prompt.instructions}</pre>
            </section>

            {prompt.style && (
              <section className="mt-6 space-y-3">
                <h3 className="font-semibold text-foreground">Star meaning</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(prompt.style.starMeaning).map(([star, meaning]) => (
                    <div key={star} className="flex items-start gap-2 rounded-md border border-border/60 bg-card px-3 py-2">
                      <Badge variant="secondary">{star}★</Badge>
                      <p className="text-sm text-muted-foreground">{meaning}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

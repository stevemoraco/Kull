import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptSearchBarProps {
  onSearchChange: (query: string) => void;
  resultCount?: number;
}

export function PromptSearchBar({ onSearchChange, resultCount }: PromptSearchBarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearchChange]);

  const handleClear = () => {
    setQuery("");
    onSearchChange("");
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search prompts by name or description..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-20"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      {resultCount !== undefined && query && (
        <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'result' : 'results'} found
        </div>
      )}
    </div>
  );
}

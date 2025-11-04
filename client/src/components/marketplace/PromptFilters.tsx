import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import type { CullingProfile, PromptSearchFilters } from "@shared/types/marketplace";

interface PromptFiltersProps {
  filters: PromptSearchFilters;
  onFiltersChange: (filters: PromptSearchFilters) => void;
  availableTags?: string[];
}

const profiles: { value: CullingProfile; label: string }[] = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'sports', label: 'Sports' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'product', label: 'Product' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'standard', label: 'Standard' },
];

const sortOptions = [
  { value: 'quality', label: 'Quality Score' },
  { value: 'popular', label: 'Most Voted' },
  { value: 'usage', label: 'Most Used' },
  { value: 'recent', label: 'Newest' },
];

export function PromptFilters({ filters, onFiltersChange, availableTags = [] }: PromptFiltersProps) {
  const handleProfileChange = (value: string) => {
    onFiltersChange({
      ...filters,
      profile: value === 'all' ? undefined : (value as CullingProfile),
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as any,
    });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.profile || (filters.tags && filters.tags.length > 0) || filters.sortBy;

  return (
    <div className="bg-card border border-card-border rounded-lg p-6 mb-8">
      <div className="flex flex-col gap-4">
        {/* Top row: Profile and Sort */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-card-foreground mb-2 block">
              Photography Style
            </label>
            <Select
              value={filters.profile || 'all'}
              onValueChange={handleProfileChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Styles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                {profiles.map(profile => (
                  <SelectItem key={profile.value} value={profile.value}>
                    {profile.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground mb-2 block">
              Sort By
            </label>
            <Select
              value={filters.sortBy || 'quality'}
              onValueChange={handleSortChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Quality Score" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
          <div>
            <label className="text-sm font-medium text-card-foreground mb-2 block">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const isSelected = filters.tags?.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

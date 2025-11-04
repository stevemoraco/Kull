import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus } from "lucide-react";
import { updatePrompt } from "@/api/prompts";
import type { CullingProfile, PromptTemplate } from "@shared/types/marketplace";
import { useToast } from "@/hooks/use-toast";

interface EditPromptModalProps {
  prompt: PromptTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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

export function EditPromptModal({ prompt, open, onOpenChange, onSuccess }: EditPromptModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [formData, setFormData] = useState({
    name: prompt.name,
    description: prompt.description,
    profile: prompt.profile,
    systemPrompt: prompt.systemPrompt,
    firstMessage: prompt.firstMessage || "",
    sampleOutput: prompt.sampleOutput || "",
    tags: prompt.tags,
    isPublic: prompt.isPublic,
  });

  useEffect(() => {
    setFormData({
      name: prompt.name,
      description: prompt.description,
      profile: prompt.profile,
      systemPrompt: prompt.systemPrompt,
      firstMessage: prompt.firstMessage || "",
      sampleOutput: prompt.sampleOutput || "",
      tags: prompt.tags,
      isPublic: prompt.isPublic,
    });
  }, [prompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.systemPrompt) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePrompt(prompt.id, formData);
      toast({
        title: "Success",
        description: "Prompt updated successfully!",
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update prompt",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription>
            Update your prompt details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">
              Prompt Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Wedding Day Story Selector"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what makes this prompt special..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="profile">
              Photography Style <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.profile}
              onValueChange={(value) => setFormData({ ...formData, profile: value as CullingProfile })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(profile => (
                  <SelectItem key={profile.value} value={profile.value}>
                    {profile.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="systemPrompt">
              System Prompt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="systemPrompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              placeholder="Enter the AI system prompt..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="firstMessage">First Message (Optional)</Label>
            <Textarea
              id="firstMessage"
              value={formData.firstMessage}
              onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
              placeholder="Optional first message to send to the AI..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="sampleOutput">Sample Output (Optional)</Label>
            <Textarea
              id="sampleOutput"
              value={formData.sampleOutput}
              onChange={(e) => setFormData({ ...formData, sampleOutput: e.target.value })}
              placeholder="Example of what this prompt produces..."
              rows={4}
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag..."
              />
              <Button type="button" onClick={addTag} variant="outline" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked as boolean })}
            />
            <Label htmlFor="isPublic" className="cursor-pointer">
              Make this prompt public
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

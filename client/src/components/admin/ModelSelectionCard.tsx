import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ModelOption {
  value: 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5';
  label: string;
  description: string;
  pricing: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'gpt-5-nano',
    label: 'GPT-5 Nano',
    description: 'Fast and cost-effective for simple queries',
    pricing: '$0.50 / 1M input tokens, $2.00 / 1M output tokens',
  },
  {
    value: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    description: 'Balanced performance and cost for most use cases',
    pricing: '$1.00 / 1M input tokens, $4.00 / 1M output tokens',
  },
  {
    value: 'gpt-5',
    label: 'GPT-5',
    description: 'Most capable model for complex queries',
    pricing: '$10.00 / 1M input tokens, $30.00 / 1M output tokens',
  },
];

export default function ModelSelectionCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5-nano');

  // Fetch current model setting
  const { data: currentSetting, isLoading } = useQuery({
    queryKey: ['/api/admin/settings', 'chat_model'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings?key=chat_model', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch model setting');
      const data = await res.json();
      return data.value || 'gpt-5-nano';
    },
  });

  // React Query v5: use useEffect instead of onSuccess
  useEffect(() => {
    if (currentSetting) {
      setSelectedModel(currentSetting);
    }
  }, [currentSetting]);

  // Mutation to save model setting
  const saveMutation = useMutation({
    mutationFn: async (model: string) => {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: 'chat_model', value: model }),
      });
      if (!res.ok) throw new Error('Failed to save model setting');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: 'Model Updated',
        description: 'Chat model setting saved successfully. All users will use the new model.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save model setting',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(selectedModel);
  };

  const hasChanges = selectedModel !== currentSetting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat Model Selection</CardTitle>
        <CardDescription>
          Choose the AI model for all user chat interactions on the platform. This setting applies globally to all users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <RadioGroup value={selectedModel} onValueChange={setSelectedModel}>
              {MODEL_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={option.value} className="text-base font-semibold cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <p className="text-xs text-muted-foreground font-mono">{option.pricing}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {hasChanges ? 'You have unsaved changes' : 'No changes to save'}
              </p>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

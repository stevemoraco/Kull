import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Brain, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const MODELS = {
  'gpt-5-nano': {
    name: 'GPT-5 Nano',
    icon: Zap,
    description: 'Fastest, most cost-efficient',
    reasoning: 'Average',
    speed: 'Very Fast',
    inputPrice: '$0.05',
    outputPrice: '$0.40',
    badge: 'Cheapest',
    badgeVariant: 'secondary' as const,
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    icon: Brain,
    description: 'Balanced performance and cost',
    reasoning: 'Good',
    speed: 'Fast',
    inputPrice: '$0.25',
    outputPrice: '$2.00',
    badge: 'Recommended',
    badgeVariant: 'default' as const,
  },
  'gpt-5': {
    name: 'GPT-5',
    icon: Rocket,
    description: 'Best for coding & complex tasks',
    reasoning: 'Higher',
    speed: 'Medium',
    inputPrice: '$1.25',
    outputPrice: '$10.00',
    badge: 'Most Powerful',
    badgeVariant: 'destructive' as const,
  },
} as const;

export function ModelSelector() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>(
    user?.preferredChatModel || 'gpt-5-nano'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/update-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ model: selectedModel }),
      });

      if (!response.ok) throw new Error('Failed to update model');

      toast({
        title: 'Model Updated',
        description: `Chat support will now use ${MODELS[selectedModel as keyof typeof MODELS].name}`,
      });

      // Force reload to get updated user data
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update model preference',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Model Selection</CardTitle>
        <CardDescription>
          Choose which GPT-5 model powers your support chat
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedModel} onValueChange={setSelectedModel}>
          <div className="space-y-4">
            {Object.entries(MODELS).map(([key, model]) => {
              const Icon = model.icon;
              const isSelected = selectedModel === key;

              return (
                <div
                  key={key}
                  className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <RadioGroupItem value={key} id={key} className="mt-1" />
                  <Label
                    htmlFor={key}
                    className="flex-1 cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold">{model.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <Badge variant={model.badgeVariant}>{model.badge}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {model.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-muted-foreground">Reasoning</div>
                        <div className="font-medium">{model.reasoning}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Speed</div>
                        <div className="font-medium">{model.speed}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Input (per 1M tokens)
                        </div>
                        <div className="font-medium">{model.inputPrice}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Output (per 1M tokens)
                        </div>
                        <div className="font-medium">{model.outputPrice}</div>
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedModel === (user?.preferredChatModel || 'gpt-5-nano')}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="mt-4 rounded-md border border-muted bg-muted/20 p-3 text-xs text-muted-foreground">
          <strong>Note:</strong> Model changes apply immediately to new chat
          messages. Previous messages were generated with the model selected at
          that time.
        </div>
      </CardContent>
    </Card>
  );
}

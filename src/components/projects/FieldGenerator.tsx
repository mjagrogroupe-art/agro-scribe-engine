import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FieldGeneratorProps {
  projectId: string;
  fieldName: string;
  fieldPurpose: string;
  constraints?: string;
  platformContext?: string;
  currentValue?: string;
  onGenerated: (value: string) => void;
}

export function FieldGenerator({
  projectId,
  fieldName,
  fieldPurpose,
  constraints,
  platformContext,
  currentValue,
  onGenerated,
}: FieldGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-field', {
        body: {
          projectId,
          fieldName,
          fieldPurpose,
          constraints,
          platformContext,
          currentValue,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.generatedText) {
        onGenerated(data.generatedText);
        toast({ title: 'Field generated', description: `${fieldName} has been generated.` });
      }
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleGenerate}
      disabled={generating}
      className="h-7 gap-1 text-xs text-primary hover:text-primary"
      title={`AI Generate: ${fieldName}`}
    >
      {generating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      Generate
    </Button>
  );
}

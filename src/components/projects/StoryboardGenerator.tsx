import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformBadge } from '@/components/ui/platform-badge';
import { 
  Loader2, 
  Film, 
  Trash2, 
  CheckCircle, 
  Camera, 
  Clock, 
  Type,
  Volume2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  useStoryboards, 
  useGenerateStoryboard, 
  useDeleteStoryboard,
  useSelectStoryboard,
  Storyboard,
  StoryboardFrame 
} from '@/hooks/useStoryboards';
import { GeneratedScript, PlatformTarget } from '@/types/database';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface StoryboardGeneratorProps {
  projectId: string;
  scripts: GeneratedScript[];
}

function FrameCard({ frame, index }: { frame: StoryboardFrame; index: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            Frame {frame.frame_number}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {frame.timestamp_start}s - {frame.timestamp_end}s
          </span>
        </div>
        {frame.camera_angle && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {frame.camera_angle}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">{frame.scene_description}</p>
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Direction:</span> {frame.visual_direction}
        </div>

        {frame.text_overlay && (
          <div className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2">
            <Type className="h-3 w-3 mt-0.5 text-primary" />
            <span>"{frame.text_overlay}"</span>
          </div>
        )}

        {frame.audio_cue && (
          <div className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2">
            <Volume2 className="h-3 w-3 mt-0.5 text-primary" />
            <span>{frame.audio_cue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StoryboardCard({ 
  storyboard, 
  projectId,
  onDelete,
  onSelect,
  isDeleting 
}: { 
  storyboard: Storyboard;
  projectId: string;
  onDelete: () => void;
  onSelect: () => void;
  isDeleting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className={storyboard.is_selected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={storyboard.platform as PlatformTarget} />
            <span className="text-sm text-muted-foreground">
              {storyboard.frames?.length || 0} frames
            </span>
            {storyboard.is_selected && (
              <Badge variant="default" className="bg-primary">
                <CheckCircle className="mr-1 h-3 w-3" />
                Selected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!storyboard.is_selected && (
              <Button variant="outline" size="sm" onClick={onSelect}>
                Select
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Created {new Date(storyboard.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              {isOpen ? 'Hide Frames' : 'View Frames'}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3">
            {storyboard.frames?.map((frame, index) => (
              <FrameCard key={frame.id} frame={frame} index={index} />
            ))}</CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function StoryboardGenerator({ projectId, scripts }: StoryboardGeneratorProps) {
  const { data: storyboards, isLoading } = useStoryboards(projectId);
  const generateMutation = useGenerateStoryboard();
  const deleteMutation = useDeleteStoryboard();
  const selectMutation = useSelectStoryboard();
  const [generatingForScript, setGeneratingForScript] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleGenerate = async (scriptId: string) => {
    setGeneratingForScript(scriptId);
    try {
      await generateMutation.mutateAsync({ scriptId, projectId });
    } finally {
      setGeneratingForScript(null);
    }
  };

  const handleDelete = async (storyboardId: string) => {
    setDeletingId(storyboardId);
    try {
      await deleteMutation.mutateAsync({ storyboardId, projectId });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (storyboardId: string) => {
    selectMutation.mutate({ storyboardId, projectId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Script Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Generate Storyboard from Script
          </CardTitle>
          <CardDescription>
            Select a script to create a detailed shot-by-shot visual storyboard for video production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scripts && scripts.length > 0 ? (
            <div className="space-y-3">
              {scripts.map((script) => (
                <div 
                  key={script.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <PlatformBadge platform={script.platform as PlatformTarget} />
                    <span className="text-sm text-muted-foreground">
                      {script.duration_seconds}s
                    </span>
                    <span className="text-sm truncate max-w-[300px]">
                      {script.hook_section}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleGenerate(script.id)}
                    disabled={generatingForScript === script.id}
                    size="sm"
                  >
                    {generatingForScript === script.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Film className="mr-2 h-4 w-4" />
                        Create Storyboard
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Generate scripts first in the Scripts tab to create storyboards.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Existing Storyboards */}
      {storyboards && storyboards.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Generated Storyboards</h3>
          {storyboards.map((storyboard) => (
            <StoryboardCard
              key={storyboard.id}
              storyboard={storyboard}
              projectId={projectId}
              onDelete={() => handleDelete(storyboard.id)}
              onSelect={() => handleSelect(storyboard.id)}
              isDeleting={deletingId === storyboard.id}
            />
          ))}
        </div>
      )}

      {(!storyboards || storyboards.length === 0) && scripts && scripts.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No storyboards generated yet. Select a script above to create one.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

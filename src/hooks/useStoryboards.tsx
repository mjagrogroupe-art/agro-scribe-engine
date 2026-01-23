import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StoryboardFrame {
  id: string;
  storyboard_id: string;
  frame_number: number;
  timestamp_start: number;
  timestamp_end: number;
  scene_description: string;
  visual_direction: string;
  camera_angle: string | null;
  text_overlay: string | null;
  audio_cue: string | null;
  created_at: string;
}

export interface Storyboard {
  id: string;
  project_id: string;
  script_id: string;
  platform: string;
  is_selected: boolean;
  created_at: string;
  frames?: StoryboardFrame[];
}

export function useStoryboards(projectId: string | undefined) {
  return useQuery({
    queryKey: ['storyboards', projectId],
    queryFn: async (): Promise<Storyboard[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('storyboards')
        .select('*, storyboard_frames(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((sb: any) => ({
        ...sb,
        frames: (sb.storyboard_frames || []).sort(
          (a: StoryboardFrame, b: StoryboardFrame) => a.frame_number - b.frame_number
        ),
      }));
    },
    enabled: !!projectId,
  });
}

export function useGenerateStoryboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scriptId, projectId }: { scriptId: string; projectId: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: { scriptId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { ...data, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['storyboards', data.projectId] });
      toast({
        title: 'Storyboard generated',
        description: `Created ${data.frameCount} frames for your video.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteStoryboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyboardId, projectId }: { storyboardId: string; projectId: string }) => {
      const { error } = await supabase
        .from('storyboards')
        .delete()
        .eq('id', storyboardId);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['storyboards', data.projectId] });
      toast({
        title: 'Storyboard deleted',
        description: 'The storyboard has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSelectStoryboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyboardId, projectId }: { storyboardId: string; projectId: string }) => {
      // Deselect all storyboards for this project
      await supabase
        .from('storyboards')
        .update({ is_selected: false })
        .eq('project_id', projectId);

      // Select the chosen one
      const { error } = await supabase
        .from('storyboards')
        .update({ is_selected: true })
        .eq('id', storyboardId);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['storyboards', data.projectId] });
      toast({
        title: 'Storyboard selected',
        description: 'This storyboard will be used for video production.',
      });
    },
  });
}

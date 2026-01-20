import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  GeneratedHook, 
  GeneratedScript, 
  VisualGuidance, 
  GeneratedCaption,
  ComplianceCheck,
  ShotItem,
  TextOverlay
} from '@/types/database';
import { toast } from '@/hooks/use-toast';

export function useGeneratedHooks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['hooks', projectId],
    queryFn: async (): Promise<GeneratedHook[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('generated_hooks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as GeneratedHook[];
    },
    enabled: !!projectId,
  });
}

export function useGeneratedScripts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['scripts', projectId],
    queryFn: async (): Promise<GeneratedScript[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('generated_scripts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as GeneratedScript[];
    },
    enabled: !!projectId,
  });
}

export function useVisualGuidance(projectId: string | undefined) {
  return useQuery({
    queryKey: ['visual_guidance', projectId],
    queryFn: async (): Promise<VisualGuidance | null> => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('visual_guidance')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        shot_list: (data.shot_list as unknown as ShotItem[]) || [],
        text_overlay_suggestions: (data.text_overlay_suggestions as unknown as TextOverlay[]) || [],
      } as VisualGuidance;
    },
    enabled: !!projectId,
  });
}

export function useGeneratedCaptions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['captions', projectId],
    queryFn: async (): Promise<GeneratedCaption[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('generated_captions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as GeneratedCaption[];
    },
    enabled: !!projectId,
  });
}

export function useComplianceChecks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['compliance', projectId],
    queryFn: async (): Promise<ComplianceCheck[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('project_id', projectId)
        .order('checked_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ComplianceCheck[];
    },
    enabled: !!projectId,
  });
}

export function useSelectHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hookId, projectId }: { hookId: string; projectId: string }) => {
      // First, deselect all hooks for this project
      await supabase
        .from('generated_hooks')
        .update({ is_selected: false })
        .eq('project_id', projectId);

      // Then select the chosen hook
      const { data, error } = await supabase
        .from('generated_hooks')
        .update({ is_selected: true })
        .eq('id', hookId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hooks', variables.projectId] });
      toast({
        title: 'Hook selected',
        description: 'This hook will be used in your content.',
      });
    },
  });
}

export function useSelectScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scriptId, projectId }: { scriptId: string; projectId: string }) => {
      // First, deselect all scripts for this project
      await supabase
        .from('generated_scripts')
        .update({ is_selected: false })
        .eq('project_id', projectId);

      // Then select the chosen script
      const { data, error } = await supabase
        .from('generated_scripts')
        .update({ is_selected: true })
        .eq('id', scriptId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scripts', variables.projectId] });
      toast({
        title: 'Script selected',
        description: 'This script will be used in your content.',
      });
    },
  });
}

export function useSelectCaption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ captionId, projectId }: { captionId: string; projectId: string }) => {
      // First, deselect all captions for this project (per platform)
      const { data: caption } = await supabase
        .from('generated_captions')
        .select('platform')
        .eq('id', captionId)
        .single();

      if (caption) {
        await supabase
          .from('generated_captions')
          .update({ is_selected: false })
          .eq('project_id', projectId)
          .eq('platform', caption.platform);
      }

      // Then select the chosen caption
      const { data, error } = await supabase
        .from('generated_captions')
        .update({ is_selected: true })
        .eq('id', captionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['captions', variables.projectId] });
      toast({
        title: 'Caption selected',
        description: 'This caption will be used for export.',
      });
    },
  });
}
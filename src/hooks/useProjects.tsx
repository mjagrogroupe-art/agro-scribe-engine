import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Project, 
  ProjectWithDetails, 
  CreateProjectInput,
  PlatformTarget,
  ContentType,
  MarketRegion,
  ProjectStatus
} from '@/types/database';
import { toast } from '@/hooks/use-toast';

// Default brand/profile IDs (TAVAAZO)
const DEFAULT_BRAND_ID = '8e41bdb4-6693-465e-8cc9-6502ff4ec507';
const DEFAULT_PROFILE_ID = '7172edbb-6e7f-45eb-9dd3-9f0c72571494';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<ProjectWithDetails[]> => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectsWithDetails = await Promise.all(
        (projects || []).map(async (project) => {
          const [platformsRes, contentTypesRes, marketsRes] = await Promise.all([
            supabase.from('project_platforms').select('platform').eq('project_id', project.id),
            supabase.from('project_content_types').select('content_type').eq('project_id', project.id),
            supabase.from('project_markets').select('market').eq('project_id', project.id),
          ]);

          return {
            ...project,
            platforms: (platformsRes.data || []).map((p) => p.platform as PlatformTarget),
            content_types: (contentTypesRes.data || []).map((c) => c.content_type as ContentType),
            markets: (marketsRes.data || []).map((m) => m.market as MarketRegion),
          } as ProjectWithDetails;
        })
      );

      return projectsWithDetails;
    },
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async (): Promise<ProjectWithDetails | null> => {
      if (!projectId) return null;

      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;
      if (!project) return null;

      const [platformsRes, contentTypesRes, marketsRes] = await Promise.all([
        supabase.from('project_platforms').select('platform').eq('project_id', project.id),
        supabase.from('project_content_types').select('content_type').eq('project_id', project.id),
        supabase.from('project_markets').select('market').eq('project_id', project.id),
      ]);

      return {
        ...project,
        platforms: (platformsRes.data || []).map((p) => p.platform as PlatformTarget),
        content_types: (contentTypesRes.data || []).map((c) => c.content_type as ContentType),
        markets: (marketsRes.data || []).map((m) => m.market as MarketRegion),
      } as ProjectWithDetails;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: input.name,
          product_sku: input.product_sku || null,
          product_id: input.product_id || null,
          language: input.language,
          brand_id: DEFAULT_BRAND_ID,
          created_by_profile_id: DEFAULT_PROFILE_ID,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      if (input.platforms.length > 0) {
        const { error } = await supabase
          .from('project_platforms')
          .insert(input.platforms.map((platform) => ({ project_id: project.id, platform })));
        if (error) throw error;
      }

      if (input.content_types.length > 0) {
        const { error } = await supabase
          .from('project_content_types')
          .insert(input.content_types.map((content_type) => ({ project_id: project.id, content_type })));
        if (error) throw error;
      }

      if (input.markets.length > 0) {
        const { error } = await supabase
          .from('project_markets')
          .insert(input.markets.map((market) => ({ project_id: project.id, market })));
        if (error) throw error;
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project created', description: 'Your content project has been created successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted', description: 'The project has been removed.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
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

export function useProjects() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['projects', profile?.brand_id],
    queryFn: async (): Promise<ProjectWithDetails[]> => {
      if (!profile) return [];

      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('brand_id', profile.brand_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each project
      const projectsWithDetails = await Promise.all(
        (projects || []).map(async (project) => {
          const [platformsRes, contentTypesRes, marketsRes] = await Promise.all([
            supabase
              .from('project_platforms')
              .select('platform')
              .eq('project_id', project.id),
            supabase
              .from('project_content_types')
              .select('content_type')
              .eq('project_id', project.id),
            supabase
              .from('project_markets')
              .select('market')
              .eq('project_id', project.id),
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
    enabled: !!profile,
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
        supabase
          .from('project_platforms')
          .select('platform')
          .eq('project_id', project.id),
        supabase
          .from('project_content_types')
          .select('content_type')
          .eq('project_id', project.id),
        supabase
          .from('project_markets')
          .select('market')
          .eq('project_id', project.id),
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
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!profile) throw new Error('No profile found');

      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: input.name,
          product_sku: input.product_sku || null,
          language: input.language,
          brand_id: profile.brand_id,
          created_by_profile_id: profile.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Insert platforms
      if (input.platforms.length > 0) {
        const { error: platformsError } = await supabase
          .from('project_platforms')
          .insert(
            input.platforms.map((platform) => ({
              project_id: project.id,
              platform,
            }))
          );
        if (platformsError) throw platformsError;
      }

      // Insert content types
      if (input.content_types.length > 0) {
        const { error: contentTypesError } = await supabase
          .from('project_content_types')
          .insert(
            input.content_types.map((content_type) => ({
              project_id: project.id,
              content_type,
            }))
          );
        if (contentTypesError) throw contentTypesError;
      }

      // Insert markets
      if (input.markets.length > 0) {
        const { error: marketsError } = await supabase
          .from('project_markets')
          .insert(
            input.markets.map((market) => ({
              project_id: project.id,
              market,
            }))
          );
        if (marketsError) throw marketsError;
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Project created',
        description: 'Your content project has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      status 
    }: { 
      projectId: string; 
      status: ProjectStatus;
    }) => {
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
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Project deleted',
        description: 'The project has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
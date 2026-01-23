import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface GeneratedImage {
  id: string;
  project_id: string;
  platform: string;
  image_url: string;
  prompt: string;
  image_type: string;
  is_selected: boolean;
  created_at: string;
}

export function useGeneratedImages(projectId: string | undefined) {
  return useQuery({
    queryKey: ["generated_images", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GeneratedImage[];
    },
    enabled: !!projectId,
  });
}

export function useGenerateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      platform, 
      imageType = "social_post",
      customPrompt 
    }: { 
      projectId: string; 
      platform: string; 
      imageType?: string;
      customPrompt?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { projectId, platform, imageType, customPrompt },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated_images", variables.projectId] });
      toast({
        title: "Image generated",
        description: "Your AI-generated image is ready!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSelectImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, projectId }: { imageId: string; projectId: string }) => {
      // First, deselect all images for this project
      await supabase
        .from("generated_images")
        .update({ is_selected: false })
        .eq("project_id", projectId);

      // Then select the specified image
      const { error } = await supabase
        .from("generated_images")
        .update({ is_selected: true })
        .eq("id", imageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated_images", variables.projectId] });
      toast({
        title: "Image selected",
        description: "This image has been marked as your preferred choice.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Selection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, projectId }: { imageId: string; projectId: string }) => {
      const { error } = await supabase
        .from("generated_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["generated_images", projectId] });
      toast({
        title: "Image deleted",
        description: "The image has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

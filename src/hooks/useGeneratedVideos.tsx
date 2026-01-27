import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeneratedVideo {
  id: string;
  project_id: string;
  platform: string;
  video_url: string | null;
  prompt: string;
  status: string;
  duration_seconds: number | null;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export function useGeneratedVideos(projectId: string | undefined) {
  const query = useQuery({
    queryKey: ["generated-videos", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("generated_videos")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GeneratedVideo[];
    },
    enabled: !!projectId,
  });

  // Check if any videos are still processing
  const hasProcessingVideos = query.data?.some(
    (video) => video.status === "pending" || video.status === "generating" || video.status === "processing"
  );

  // Poll every 5 seconds when there are processing videos
  const pollQuery = useQuery({
    queryKey: ["generated-videos-poll", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("generated_videos")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GeneratedVideo[];
    },
    enabled: !!projectId && hasProcessingVideos,
    refetchInterval: hasProcessingVideos ? 5000 : false,
  });

  // Return the poll query data when polling, otherwise the main query
  return {
    ...query,
    data: pollQuery.data ?? query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching || pollQuery.isRefetching,
  };
}

export function useGenerateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      platform, 
      prompt,
      durationSeconds = 5
    }: { 
      projectId: string; 
      platform: string; 
      prompt: string;
      durationSeconds?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: { projectId, platform, prompt, durationSeconds },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated-videos", variables.projectId] });
      
      if (data?.message) {
        toast.success(data.message);
      } else {
        toast.success("Video generated successfully!");
      }
    },
    onError: (error: Error) => {
      console.error("Video generation error:", error);
      toast.error(error.message || "Failed to generate video");
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from("generated_videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-videos"] });
      toast.success("Video deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete video");
    },
  });
}

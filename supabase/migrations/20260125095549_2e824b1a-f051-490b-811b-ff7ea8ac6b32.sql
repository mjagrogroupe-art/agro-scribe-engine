-- Create generated_videos table for storing AI-generated videos
CREATE TABLE public.generated_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  video_url TEXT,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_seconds INTEGER,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (users can access videos for projects they can access)
CREATE POLICY "Users can view videos for accessible projects"
ON public.generated_videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.brand_id = p.brand_id
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create videos for accessible projects"
ON public.generated_videos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.brand_id = p.brand_id
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update videos for accessible projects"
ON public.generated_videos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.brand_id = p.brand_id
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete videos for accessible projects"
ON public.generated_videos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.brand_id = p.brand_id
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_generated_videos_updated_at
BEFORE UPDATE ON public.generated_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create table for AI-generated images
CREATE TABLE public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'social_post',
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Create policies for generated_images
CREATE POLICY "Users can view generated images for their brand's projects" 
ON public.generated_images 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON p.brand_id = pr.brand_id
    WHERE p.id = generated_images.project_id
    AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert generated images for their brand's projects" 
ON public.generated_images 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON p.brand_id = pr.brand_id
    WHERE p.id = generated_images.project_id
    AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update generated images for their brand's projects" 
ON public.generated_images 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON p.brand_id = pr.brand_id
    WHERE p.id = generated_images.project_id
    AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete generated images for their brand's projects" 
ON public.generated_images 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON p.brand_id = pr.brand_id
    WHERE p.id = generated_images.project_id
    AND pr.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_generated_images_project_id ON public.generated_images(project_id);
CREATE INDEX idx_generated_images_platform ON public.generated_images(platform);
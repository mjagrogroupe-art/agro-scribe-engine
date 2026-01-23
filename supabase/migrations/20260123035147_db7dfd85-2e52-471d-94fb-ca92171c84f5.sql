-- Create storyboards table for script-to-storyboard generation
CREATE TABLE public.storyboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.generated_scripts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_selected BOOLEAN DEFAULT false
);

-- Create storyboard frames table
CREATE TABLE public.storyboard_frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL,
  timestamp_start DECIMAL NOT NULL,
  timestamp_end DECIMAL NOT NULL,
  scene_description TEXT NOT NULL,
  visual_direction TEXT NOT NULL,
  camera_angle TEXT,
  text_overlay TEXT,
  audio_cue TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboard_frames ENABLE ROW LEVEL SECURITY;

-- RLS policies for storyboards
CREATE POLICY "Users can view storyboards for accessible projects" 
  ON public.storyboards FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = storyboards.project_id 
    AND can_access_project(p.id, auth.uid())
  ));

CREATE POLICY "Users can create storyboards for accessible projects" 
  ON public.storyboards FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_id 
    AND can_access_project(p.id, auth.uid())
  ));

CREATE POLICY "Users can update storyboards for accessible projects" 
  ON public.storyboards FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = storyboards.project_id 
    AND can_access_project(p.id, auth.uid())
  ));

CREATE POLICY "Users can delete storyboards for accessible projects" 
  ON public.storyboards FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = storyboards.project_id 
    AND can_access_project(p.id, auth.uid())
  ));

-- RLS policies for storyboard_frames (inherit from storyboard access)
CREATE POLICY "Users can view frames for accessible storyboards" 
  ON public.storyboard_frames FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM storyboards s 
    JOIN projects p ON p.id = s.project_id 
    WHERE s.id = storyboard_frames.storyboard_id 
    AND can_access_project(p.id, auth.uid())
  ));

CREATE POLICY "Users can create frames for accessible storyboards" 
  ON public.storyboard_frames FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM storyboards s 
    JOIN projects p ON p.id = s.project_id 
    WHERE s.id = storyboard_id 
    AND can_access_project(p.id, auth.uid())
  ));

CREATE POLICY "Users can update frames for accessible storyboards" 
  ON public.storyboard_frames FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM storyboards s 
    JOIN projects p ON p.id = s.project_id 
    WHERE s.id = storyboard_frames.storyboard_id 
    AND can_access_project(p.id, auth.uid())
  ));

CREATE POLICY "Users can delete frames for accessible storyboards" 
  ON public.storyboard_frames FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM storyboards s 
    JOIN projects p ON p.id = s.project_id 
    WHERE s.id = storyboard_frames.storyboard_id 
    AND can_access_project(p.id, auth.uid())
  ));
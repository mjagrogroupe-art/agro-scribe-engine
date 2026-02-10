
-- Fix storyboards INSERT policy: arguments to can_access_project are reversed
DROP POLICY "Users can create storyboards for accessible projects" ON public.storyboards;
CREATE POLICY "Users can create storyboards for accessible projects" ON public.storyboards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = storyboards.project_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

-- Fix storyboards SELECT policy
DROP POLICY "Users can view storyboards for accessible projects" ON public.storyboards;
CREATE POLICY "Users can view storyboards for accessible projects" ON public.storyboards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = storyboards.project_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

-- Fix storyboards UPDATE policy
DROP POLICY "Users can update storyboards for accessible projects" ON public.storyboards;
CREATE POLICY "Users can update storyboards for accessible projects" ON public.storyboards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = storyboards.project_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

-- Fix storyboards DELETE policy
DROP POLICY "Users can delete storyboards for accessible projects" ON public.storyboards;
CREATE POLICY "Users can delete storyboards for accessible projects" ON public.storyboards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = storyboards.project_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

-- Fix storyboard_frames INSERT policy
DROP POLICY "Users can create frames for accessible storyboards" ON public.storyboard_frames;
CREATE POLICY "Users can create frames for accessible storyboards" ON public.storyboard_frames
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = storyboard_frames.storyboard_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

-- Fix storyboard_frames SELECT policy
DROP POLICY "Users can view frames for accessible storyboards" ON public.storyboard_frames;
CREATE POLICY "Users can view frames for accessible storyboards" ON public.storyboard_frames
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = storyboard_frames.storyboard_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

-- Fix storyboard_frames UPDATE policy
DROP POLICY "Users can update frames for accessible storyboards" ON public.storyboard_frames;
CREATE POLICY "Users can update frames for accessible storyboards" ON public.storyboard_frames
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = storyboard_frames.storyboard_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

-- Fix storyboard_frames DELETE policy
DROP POLICY "Users can delete frames for accessible storyboards" ON public.storyboard_frames;
CREATE POLICY "Users can delete frames for accessible storyboards" ON public.storyboard_frames
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM storyboards s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = storyboard_frames.storyboard_id
        AND can_access_project(auth.uid(), p.id)
    )
  );

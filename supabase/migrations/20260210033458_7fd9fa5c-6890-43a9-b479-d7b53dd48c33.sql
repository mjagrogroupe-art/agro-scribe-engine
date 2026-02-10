
-- Disable RLS on all tables
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_hooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_captions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboard_frames DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_guidance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_platforms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_content_types DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

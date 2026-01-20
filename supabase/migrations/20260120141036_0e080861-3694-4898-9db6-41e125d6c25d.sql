-- Create enums for the content engine
CREATE TYPE public.app_role AS ENUM ('content_operator', 'approver');
CREATE TYPE public.project_status AS ENUM ('draft', 'qa_failed', 'pending_approval', 'approved', 'exported');
CREATE TYPE public.platform_target AS ENUM ('tiktok', 'instagram_reels', 'facebook_reels', 'youtube_shorts');
CREATE TYPE public.content_type AS ENUM ('education', 'product', 'authority', 'trust');
CREATE TYPE public.market_region AS ENUM ('fr', 'de', 'gcc', 'global');
CREATE TYPE public.hook_type AS ENUM ('curiosity', 'authority', 'pain_point', 'visual');
CREATE TYPE public.language_code AS ENUM ('en', 'fr', 'de');

-- Create brands table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default brand
INSERT INTO public.brands (name) VALUES ('TAVAAZO');

-- Create profiles table (links users to brands with roles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'content_operator',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, brand_id)
);

-- Create user_roles table (for has_role function compatibility)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create projects table (main content projects)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_sku TEXT,
  status project_status NOT NULL DEFAULT 'draft',
  language language_code NOT NULL DEFAULT 'en',
  suggested_duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_platforms junction table
CREATE TABLE public.project_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform platform_target NOT NULL,
  UNIQUE(project_id, platform)
);

-- Create project_content_types junction table
CREATE TABLE public.project_content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  UNIQUE(project_id, content_type)
);

-- Create project_markets junction table
CREATE TABLE public.project_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  market market_region NOT NULL,
  UNIQUE(project_id, market)
);

-- Create generated_hooks table
CREATE TABLE public.generated_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hook_type hook_type NOT NULL,
  hook_text TEXT NOT NULL,
  retention_score INTEGER CHECK (retention_score >= 0 AND retention_score <= 100),
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_scripts table
CREATE TABLE public.generated_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform platform_target NOT NULL,
  hook_section TEXT NOT NULL,
  value_delivery TEXT NOT NULL,
  brand_anchor TEXT NOT NULL,
  soft_cta TEXT NOT NULL,
  full_script TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visual_guidance table
CREATE TABLE public.visual_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shot_list JSONB NOT NULL DEFAULT '[]',
  camera_framing TEXT,
  text_overlay_suggestions JSONB DEFAULT '[]',
  logo_placement TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_captions table
CREATE TABLE public.generated_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform platform_target NOT NULL,
  caption_text TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_checks table
CREATE TABLE public.compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  check_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  notes TEXT,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval_history table
CREATE TABLE public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  approved_by_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  previous_status project_status NOT NULL,
  new_status project_status NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's profile for a brand
CREATE OR REPLACE FUNCTION public.get_user_profile_for_brand(_user_id UUID, _brand_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles 
  WHERE user_id = _user_id AND brand_id = _brand_id
  LIMIT 1
$$;

-- Create function to check if user can access project
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles prof ON prof.brand_id = p.brand_id
    WHERE p.id = _project_id AND prof.user_id = _user_id
  )
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_brand_id UUID;
BEGIN
  -- Get the default TAVAAZO brand
  SELECT id INTO default_brand_id FROM public.brands WHERE name = 'TAVAAZO' LIMIT 1;
  
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, brand_id, role, full_name)
  VALUES (NEW.id, default_brand_id, 'content_operator', NEW.raw_user_meta_data->>'full_name');
  
  -- Add to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'content_operator');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brands
CREATE POLICY "Users can view brands they belong to"
ON public.brands FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.brand_id = brands.id AND profiles.user_id = auth.uid()
));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profiles"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create profiles during signup"
ON public.profiles FOR INSERT
WITH CHECK (true)
AS SECURITY DEFINER;

CREATE POLICY "Users can update their own profiles"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their brand"
ON public.projects FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.brand_id = projects.brand_id AND profiles.user_id = auth.uid()
));

CREATE POLICY "Content operators can create projects"
ON public.projects FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.brand_id = brand_id 
    AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update projects in their brand"
ON public.projects FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.brand_id = projects.brand_id AND profiles.user_id = auth.uid()
));

CREATE POLICY "Content operators can delete draft projects"
ON public.projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.brand_id = projects.brand_id 
      AND profiles.user_id = auth.uid()
  )
  AND status = 'draft'
);

-- RLS Policies for project_platforms
CREATE POLICY "Users can view project platforms"
ON public.project_platforms FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can manage project platforms"
ON public.project_platforms FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update project platforms"
ON public.project_platforms FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete project platforms"
ON public.project_platforms FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for project_content_types
CREATE POLICY "Users can view project content types"
ON public.project_content_types FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can manage project content types"
ON public.project_content_types FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update project content types"
ON public.project_content_types FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete project content types"
ON public.project_content_types FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for project_markets
CREATE POLICY "Users can view project markets"
ON public.project_markets FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can manage project markets"
ON public.project_markets FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update project markets"
ON public.project_markets FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete project markets"
ON public.project_markets FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for generated_hooks
CREATE POLICY "Users can view generated hooks"
ON public.generated_hooks FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can create generated hooks"
ON public.generated_hooks FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update generated hooks"
ON public.generated_hooks FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete generated hooks"
ON public.generated_hooks FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for generated_scripts
CREATE POLICY "Users can view generated scripts"
ON public.generated_scripts FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can create generated scripts"
ON public.generated_scripts FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update generated scripts"
ON public.generated_scripts FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete generated scripts"
ON public.generated_scripts FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for visual_guidance
CREATE POLICY "Users can view visual guidance"
ON public.visual_guidance FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can create visual guidance"
ON public.visual_guidance FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update visual guidance"
ON public.visual_guidance FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete visual guidance"
ON public.visual_guidance FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for generated_captions
CREATE POLICY "Users can view generated captions"
ON public.generated_captions FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can create generated captions"
ON public.generated_captions FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update generated captions"
ON public.generated_captions FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete generated captions"
ON public.generated_captions FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for compliance_checks
CREATE POLICY "Users can view compliance checks"
ON public.compliance_checks FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can create compliance checks"
ON public.compliance_checks FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can update compliance checks"
ON public.compliance_checks FOR UPDATE
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Users can delete compliance checks"
ON public.compliance_checks FOR DELETE
USING (public.can_access_project(auth.uid(), project_id));

-- RLS Policies for approval_history
CREATE POLICY "Users can view approval history"
ON public.approval_history FOR SELECT
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Approvers can create approval records"
ON public.approval_history FOR INSERT
WITH CHECK (public.can_access_project(auth.uid(), project_id));
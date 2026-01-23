// Database types for the content engine
export type AppRole = 'content_operator' | 'approver';
export type ProjectStatus = 'draft' | 'qa_failed' | 'pending_approval' | 'approved' | 'exported';
export type PlatformTarget = 'tiktok' | 'instagram_reels' | 'facebook_reels' | 'youtube_shorts';
export type ContentType = 'education' | 'product' | 'authority' | 'trust';
export type MarketRegion = 'fr' | 'de' | 'gcc' | 'global';
export type HookType = 'curiosity' | 'authority' | 'pain_point' | 'visual';
export type LanguageCode = 'en' | 'fr' | 'de';

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  brand_id: string;
  role: AppRole;
  full_name: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  brand_id: string;
  created_by_profile_id: string;
  name: string;
  product_sku: string | null;
  status: ProjectStatus;
  language: LanguageCode;
  suggested_duration: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithDetails extends Project {
  platforms: PlatformTarget[];
  content_types: ContentType[];
  markets: MarketRegion[];
  brand?: Brand;
  created_by?: Profile;
}

export interface ProjectPlatform {
  id: string;
  project_id: string;
  platform: PlatformTarget;
}

export interface ProjectContentType {
  id: string;
  project_id: string;
  content_type: ContentType;
}

export interface ProjectMarket {
  id: string;
  project_id: string;
  market: MarketRegion;
}

export interface GeneratedHook {
  id: string;
  project_id: string;
  hook_type: HookType;
  hook_text: string;
  retention_score: number | null;
  is_selected: boolean;
  created_at: string;
}

export interface GeneratedScript {
  id: string;
  project_id: string;
  platform: PlatformTarget;
  hook_section: string;
  value_delivery: string;
  brand_anchor: string;
  soft_cta: string;
  full_script: string;
  duration_seconds: number;
  is_selected: boolean;
  created_at: string;
}

export interface VisualGuidance {
  id: string;
  project_id: string;
  shot_list: ShotItem[];
  camera_framing: string | null;
  text_overlay_suggestions: TextOverlay[];
  logo_placement: string | null;
  created_at: string;
}

export interface ShotItem {
  order: number;
  description: string;
  duration: string;
  framing: string;
}

export interface TextOverlay {
  text: string;
  position: string;
  timing: string;
}

export interface GeneratedCaption {
  id: string;
  project_id: string;
  platform: PlatformTarget;
  caption_text: string;
  hashtags: string[];
  seo_title: string | null;
  seo_description: string | null;
  is_selected: boolean;
  created_at: string;
}

export interface ComplianceCheck {
  id: string;
  project_id: string;
  check_name: string;
  passed: boolean;
  notes: string | null;
  checked_at: string;
}

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

export interface ApprovalHistory {
  id: string;
  project_id: string;
  approved_by_profile_id: string;
  previous_status: ProjectStatus;
  new_status: ProjectStatus;
  rejection_reason: string | null;
  created_at: string;
}

// Form types for creating/editing
export interface CreateProjectInput {
  name: string;
  product_sku?: string;
  language: LanguageCode;
  platforms: PlatformTarget[];
  content_types: ContentType[];
  markets: MarketRegion[];
}
// Platform configurations with duration limits
export const PLATFORMS = {
  tiktok: {
    label: 'TikTok',
    minDuration: 15,
    maxDuration: 25,
    icon: 'TikTok',
    className: 'platform-tiktok',
  },
  instagram_reels: {
    label: 'Instagram Reels',
    minDuration: 20,
    maxDuration: 30,
    icon: 'Instagram',
    className: 'platform-instagram',
  },
  facebook_reels: {
    label: 'Facebook Reels',
    minDuration: 20,
    maxDuration: 30,
    icon: 'Facebook',
    className: 'platform-facebook',
  },
  youtube_shorts: {
    label: 'YouTube Shorts',
    minDuration: 30,
    maxDuration: 45,
    icon: 'Youtube',
    className: 'platform-youtube',
  },
} as const;

export type PlatformKey = keyof typeof PLATFORMS;

// Content types
export const CONTENT_TYPES = {
  education: { label: 'Education', description: 'Inform and teach viewers' },
  product: { label: 'Product', description: 'Showcase product features' },
  authority: { label: 'Authority', description: 'Establish brand expertise' },
  trust: { label: 'Trust', description: 'Build credibility and trust' },
} as const;

export type ContentTypeKey = keyof typeof CONTENT_TYPES;

// Market regions
export const MARKETS = {
  fr: { label: 'France', flag: '🇫🇷' },
  de: { label: 'Germany', flag: '🇩🇪' },
  gcc: { label: 'GCC', flag: '🌍' },
  global: { label: 'Global', flag: '🌐' },
} as const;

export type MarketKey = keyof typeof MARKETS;

// Languages
export const LANGUAGES = {
  en: { label: 'English', code: 'EN' },
  fr: { label: 'French', code: 'FR' },
  de: { label: 'German', code: 'DE' },
} as const;

export type LanguageKey = keyof typeof LANGUAGES;

// Project statuses
export const PROJECT_STATUSES = {
  draft: { label: 'Draft', className: 'status-draft' },
  qa_failed: { label: 'QA Failed', className: 'status-qa-failed' },
  pending_approval: { label: 'Pending Approval', className: 'status-pending' },
  approved: { label: 'Approved', className: 'status-approved' },
  exported: { label: 'Exported', className: 'status-exported' },
} as const;

export type ProjectStatusKey = keyof typeof PROJECT_STATUSES;

// Hook types
export const HOOK_TYPES = {
  curiosity: { label: 'Curiosity Hook', description: 'Sparks interest with a question or mystery' },
  authority: { label: 'Authority Hook', description: 'Establishes credibility immediately' },
  pain_point: { label: 'Pain-Point Hook', description: 'Addresses a common problem' },
  visual: { label: 'Visual Hook', description: 'Captivates with striking imagery' },
} as const;

export type HookTypeKey = keyof typeof HOOK_TYPES;

// Compliance rules
export const COMPLIANCE_RULES = {
  resolution: { label: 'Resolution', description: '1080 × 1920 (9:16)' },
  aspect_ratio: { label: 'Aspect Ratio', description: '9:16 vertical' },
  duration: { label: 'Duration', description: 'Within platform limits' },
  no_medical_claims: { label: 'No Medical Claims', description: 'No disease/health promises' },
  no_watermarks: { label: 'No Watermarks', description: 'Clean, no platform watermarks' },
  brand_tone: { label: 'Brand Tone', description: 'Premium, calm, credible' },
} as const;

// Visual guidance rules
export const VISUAL_RULES = {
  aspectRatio: '9:16',
  resolution: '1080 × 1920',
  logoMaxPercent: 6,
  textMaxPercent: 20,
  safeZonePercent: 80,
};

// Brand context for AI prompts
export const BRAND_CONTEXT = {
  name: 'TAVAAZO',
  company: 'MJ Agro',
  tone: ['Premium', 'Calm', 'Credible'],
  heritage: 'Global-agri heritage',
  modernContext: 'Modern kitchens',
  avoid: ['Hype', 'Medical promises', 'Influencer slang', 'Greetings in hooks'],
};
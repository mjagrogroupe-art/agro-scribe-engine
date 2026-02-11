import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_CONTEXT = {
  name: "TAVAAZO",
  company: "MJ Agro",
  tone: "Premium, calm, credible",
  avoid: "Hype, medical claims, influencer slang, greetings in hooks",
};

const STRICT_PRODUCT_RULES = `
STRICT PRODUCT REFERENCE MODE:
- You MUST reference ONLY the selected product data provided below.
- You MUST NOT invent products, redesign packaging, change pack shapes/colors/logos, or hallucinate missing assets.
- If product data is missing, state what is needed — do NOT guess.
- All product details are READ-ONLY.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: corsHeaders });
    }

    const { projectId, type } = requestBody;
    if (!projectId || !type || !["hooks", "scripts", "captions"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid request parameters" }), { status: 400, headers: corsHeaders });
    }

    // Fetch project with product
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, project_platforms(platform), project_content_types(content_type), products(*)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: corsHeaders });
    }

    const platforms = project.project_platforms?.map((p: any) => p.platform) || [];
    const contentTypes = project.project_content_types?.map((c: any) => c.content_type) || [];
    const product = project.products;

    // Build product context block
    let productBlock = "";
    if (product) {
      productBlock = `
SELECTED PRODUCT (READ-ONLY):
- SKU: ${product.sku}
- Name: ${product.name}
- Description: ${product.description || "N/A"}
- Pack Type: ${product.pack_type || "N/A"}
- Pack Size: ${product.pack_size || "N/A"}
- Compliance: ${(product.compliance_flags || []).join(", ") || "None"}
- Assets: ${product.image_urls?.length || 0} images, ${product.video_urls?.length || 0} videos`;
    } else {
      productBlock = `NO PRODUCT SELECTED — use generic: "${project.product_sku || 'Premium nuts and dried fruits'}"`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), { status: 500, headers: corsHeaders });
    }

    let prompt = "";
    if (type === "hooks") {
      prompt = `${STRICT_PRODUCT_RULES}
${productBlock}

Generate 4 video hooks for ${BRAND_CONTEXT.name} (${BRAND_CONTEXT.company}).
Content type: ${contentTypes.join(", ")}
Language: ${project.language.toUpperCase()}
Brand tone: ${BRAND_CONTEXT.tone}
AVOID: ${BRAND_CONTEXT.avoid}

Generate exactly 4 hooks (max 2 seconds each when spoken):
1. curiosity - sparks interest with mystery
2. authority - establishes credibility immediately
3. pain_point - addresses a common problem
4. visual - describes striking imagery

CRITICAL: hook_type must be EXACTLY one of: "curiosity", "authority", "pain_point", "visual"

Return JSON array with: hook_type, hook_text, retention_score (0-100)`;
    } else if (type === "scripts") {
      prompt = `${STRICT_PRODUCT_RULES}
${productBlock}

Generate platform-specific video scripts for ${BRAND_CONTEXT.name}.
Platforms: ${platforms.join(", ")}
Duration limits: TikTok 15-25s, Instagram 20-30s, Facebook 20-30s, YouTube Shorts 30-45s

Structure (locked):
1. Hook (2s)
2. Value Delivery (main content)
3. Brand Anchor (mention ${BRAND_CONTEXT.name})
4. Soft CTA (no hard sell)

Brand tone: ${BRAND_CONTEXT.tone}
AVOID: ${BRAND_CONTEXT.avoid}

Return JSON array with: platform, hook_section, value_delivery, brand_anchor, soft_cta, full_script, duration_seconds`;
    } else if (type === "captions") {
      prompt = `${STRICT_PRODUCT_RULES}
${productBlock}

Generate platform-native captions for ${BRAND_CONTEXT.name}.
Platforms: ${platforms.join(", ")}
Language: ${project.language.toUpperCase()}
Content type: ${contentTypes.join(", ")}

Brand tone: ${BRAND_CONTEXT.tone}
AVOID: ${BRAND_CONTEXT.avoid}

For each platform, generate:
- caption_text: Platform-optimized caption (TikTok: casual, Instagram: polished, YouTube: descriptive)
- hashtags: Array of relevant hashtags (5-10)
- seo_title: SEO-optimized title (under 60 chars)
- seo_description: Meta description (under 160 chars)

CRITICAL: platform must be EXACTLY one of: "tiktok", "instagram_reels", "facebook_reels", "youtube_shorts"

Return JSON array with: platform, caption_text, hashtags, seo_title, seo_description`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an enterprise content engine for premium FMCG brands. STRICT PRODUCT REFERENCE MODE. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      if (statusCode === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: corsHeaders });
      if (statusCode === 402) return new Response(JSON.stringify({ error: "Service credits exhausted." }), { status: 402, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Content generation service unavailable" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Invalid response format" }), { status: 500, headers: corsHeaders });
    }

    let generated: any[];
    try {
      generated = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: "Response parsing failed" }), { status: 500, headers: corsHeaders });
    }

    // Save to database
    if (type === "hooks") {
      const { error: insertError } = await supabase.from("generated_hooks").insert(
        generated.map((h) => ({ project_id: projectId, hook_type: h.hook_type, hook_text: h.hook_text, retention_score: h.retention_score }))
      );
      if (insertError) return new Response(JSON.stringify({ error: "Failed to save" }), { status: 500, headers: corsHeaders });
    } else if (type === "scripts") {
      const { error: insertError } = await supabase.from("generated_scripts").insert(
        generated.map((s) => ({ project_id: projectId, platform: s.platform, hook_section: s.hook_section, value_delivery: s.value_delivery, brand_anchor: s.brand_anchor, soft_cta: s.soft_cta, full_script: s.full_script, duration_seconds: s.duration_seconds }))
      );
      if (insertError) return new Response(JSON.stringify({ error: "Failed to save" }), { status: 500, headers: corsHeaders });
    } else if (type === "captions") {
      const { error: insertError } = await supabase.from("generated_captions").insert(
        generated.map((c) => ({ project_id: projectId, platform: c.platform, caption_text: c.caption_text, hashtags: c.hashtags || [], seo_title: c.seo_title, seo_description: c.seo_description }))
      );
      if (insertError) return new Response(JSON.stringify({ error: "Failed to save" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, count: generated.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Content generation failed" }), { status: 500, headers: corsHeaders });
  }
});

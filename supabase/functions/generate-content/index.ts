import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

// Validation schemas
const ContentTypeEnum = z.enum(["hooks", "scripts"]);
const UUIDSchema = z.string().uuid("Invalid project ID format");

const RequestSchema = z.object({
  projectId: UUIDSchema,
  type: ContentTypeEnum,
});

type GenerateContentRequest = z.infer<typeof RequestSchema>;

// Generic error response mapping
function getGenericErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "Invalid request parameters";
  }
  return "Content generation failed";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse and validate request body
    let requestBody: GenerateContentRequest;
    try {
      const body = await req.json();
      requestBody = RequestSchema.parse(body);
    } catch (error) {
      console.error("Validation error:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { projectId, type } = requestBody;
    
    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, project_platforms(platform), project_content_types(content_type)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: corsHeaders });
    }

    const platforms = project.project_platforms?.map((p: { platform: string }) => p.platform) || [];
    const contentTypes = project.project_content_types?.map((c: { content_type: string }) => c.content_type) || [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("AI API key not configured");
      return new Response(JSON.stringify({ error: "Service configuration error" }), { status: 500, headers: corsHeaders });
    }

    let prompt = "";
    if (type === "hooks") {
      prompt = `Generate 4 video hooks for ${BRAND_CONTEXT.name} (${BRAND_CONTEXT.company}).
Product: ${project.product_sku || "Premium nuts and dried fruits"}
Content type: ${contentTypes.join(", ")}
Language: ${project.language.toUpperCase()}

Brand tone: ${BRAND_CONTEXT.tone}
AVOID: ${BRAND_CONTEXT.avoid}

Generate exactly 4 hooks (max 2 seconds each when spoken):
1. Curiosity Hook - sparks interest with mystery
2. Authority Hook - establishes credibility immediately  
3. Pain-Point Hook - addresses a common problem
4. Visual Hook - describes striking imagery

Return JSON array with: hook_type, hook_text, retention_score (0-100)`;
    } else if (type === "scripts") {
      prompt = `Generate platform-specific video scripts for ${BRAND_CONTEXT.name}.
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
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert content strategist for premium food brands. Return only valid JSON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      console.error("AI service error:", statusCode);
      return new Response(
        JSON.stringify({ error: "Content generation service unavailable" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Invalid AI response format");
      return new Response(JSON.stringify({ error: "Invalid response format" }), { status: 500, headers: corsHeaders });
    }

    let generated: { hook_type?: string; hook_text?: string; retention_score?: number; platform?: string; hook_section?: string; value_delivery?: string; brand_anchor?: string; soft_cta?: string; full_script?: string; duration_seconds?: number }[];
    try {
      generated = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ error: "Response parsing failed" }), { status: 500, headers: corsHeaders });
    }

    // Save to database
    if (type === "hooks") {
      const hooks = generated.map((h) => ({
        project_id: projectId,
        hook_type: h.hook_type,
        hook_text: h.hook_text,
        retention_score: h.retention_score,
      }));
      const { error: insertError } = await supabase.from("generated_hooks").insert(hooks);
      if (insertError) {
        console.error("Database insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save generated content" }), { status: 500, headers: corsHeaders });
      }
    } else if (type === "scripts") {
      const scripts = generated.map((s) => ({
        project_id: projectId,
        platform: s.platform,
        hook_section: s.hook_section,
        value_delivery: s.value_delivery,
        brand_anchor: s.brand_anchor,
        soft_cta: s.soft_cta,
        full_script: s.full_script,
        duration_seconds: s.duration_seconds,
      }));
      const { error: insertError } = await supabase.from("generated_scripts").insert(scripts);
      if (insertError) {
        console.error("Database insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save generated content" }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ success: true, count: generated.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const genericError = getGenericErrorMessage(err);
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: genericError }), { status: 500, headers: corsHeaders });
  }
});

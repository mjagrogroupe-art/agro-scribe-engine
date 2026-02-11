import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRICT_PRODUCT_RULES = `STRICT PRODUCT REFERENCE MODE:
- Use ONLY the provided product data and assets.
- NEVER invent, redesign, or replace product packaging.
- Product must appear exactly as provided in all visuals.
- You MAY place the product in scenes (shelf, kitchen, lifestyle).
- You MAY apply lighting, shadows, depth, and environment changes.
- You MAY NOT edit packaging design, alter colors/labels, or morph formats.`;

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

    const { projectId, platform, imageType = "social_post", customPrompt } = await req.json();

    if (!projectId || !platform) {
      return new Response(JSON.stringify({ error: "Missing required fields: projectId, platform" }), { status: 400, headers: corsHeaders });
    }

    // Fetch project with product
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, project_content_types(content_type), products(*)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: corsHeaders });
    }

    const product = project.products;
    const contentTypes = project.project_content_types?.map((c: any) => c.content_type) || [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), { status: 500, headers: corsHeaders });
    }

    const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
      tiktok: { width: 1080, height: 1920 },
      instagram_reels: { width: 1080, height: 1920 },
      facebook_reels: { width: 1080, height: 1920 },
      youtube_shorts: { width: 1080, height: 1920 },
      instagram_post: { width: 1080, height: 1080 },
      facebook_post: { width: 1200, height: 630 },
    };

    const dimensions = PLATFORM_DIMENSIONS[platform] || { width: 1080, height: 1920 };
    const aspectRatio = dimensions.width === dimensions.height ? "square 1:1" : dimensions.width > dimensions.height ? "landscape 16:9" : "portrait 9:16";

    // Build product-aware prompt
    let productBlock = "";
    if (product) {
      productBlock = `
PRODUCT (reference-locked, do NOT modify):
- Name: ${product.name} (SKU: ${product.sku})
- Pack Type: ${product.pack_type || "N/A"}
- Pack Size: ${product.pack_size || "N/A"}
- Primary Color: ${product.primary_color || "N/A"}
- Secondary Color: ${product.secondary_color || "N/A"}
${product.image_urls?.length ? `- Reference Images available: ${product.image_urls.length}` : ""}`;
    }

    const basePrompt = customPrompt || `${STRICT_PRODUCT_RULES}

${productBlock}

Generate a premium product image for TAVAAZO (MJ Agro).
Content style: ${contentTypes.join(", ") || "product showcase"}
Aspect ratio: ${aspectRatio}
Image type: ${imageType === "thumbnail" ? "video thumbnail" : "social media post"}

Requirements:
- Premium presentation of ${product ? product.name : "nuts and dried fruits"}
- Elegant, natural lighting with warm tones
- Professional food photography style
- No text overlays, pure visual content
- Product must appear exactly as described — no design alterations
- Sophisticated composition for ${platform.replace("_", " ")}

Ultra high resolution, photorealistic, commercial quality.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: basePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      if (statusCode === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: corsHeaders });
      if (statusCode === 402) return new Response(JSON.stringify({ error: "Service credits exhausted." }), { status: 402, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Image generation service unavailable" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await response.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return new Response(JSON.stringify({ error: "Image generation failed - no image returned" }), { status: 500, headers: corsHeaders });
    }

    const { data: insertedImage, error: insertError } = await supabase
      .from("generated_images")
      .insert({ project_id: projectId, platform, image_url: imageData, prompt: basePrompt, image_type: imageType })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to save generated image" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, image: insertedImage }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Image generation failed" }), { status: 500, headers: corsHeaders });
  }
});

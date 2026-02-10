import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_CONTEXT = {
  name: "TAVAAZO",
  company: "MJ Agro",
  style: "Premium, elegant, natural colors",
  products: "Premium nuts, dried fruits, saffron",
};

// Platform-specific dimensions (9:16 for vertical short-form)
const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
  tiktok: { width: 1080, height: 1920 },
  instagram_reels: { width: 1080, height: 1920 },
  facebook_reels: { width: 1080, height: 1920 },
  youtube_shorts: { width: 1080, height: 1920 },
  instagram_post: { width: 1080, height: 1080 },
  facebook_post: { width: 1200, height: 630 },
};

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

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error("Validation error:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { projectId, platform, imageType = "social_post", customPrompt } = requestBody;

    if (!projectId || !platform) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: projectId, platform" }),
        { status: 400, headers: corsHeaders }
      );
    }

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

    const contentTypes = project.project_content_types?.map((c: { content_type: string }) => c.content_type) || [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("AI API key not configured");
      return new Response(JSON.stringify({ error: "Service configuration error" }), { status: 500, headers: corsHeaders });
    }

    // Get dimensions for platform
    const dimensions = PLATFORM_DIMENSIONS[platform] || { width: 1080, height: 1920 };
    const aspectRatio = dimensions.width === dimensions.height ? "square 1:1" : 
                        dimensions.width > dimensions.height ? "landscape 16:9" : "portrait 9:16";

    // Build image generation prompt
    const basePrompt = customPrompt || `Premium food product photography for ${BRAND_CONTEXT.name} brand.
Product category: ${project.product_sku || BRAND_CONTEXT.products}
Content style: ${contentTypes.join(", ") || "product showcase"}
Visual style: ${BRAND_CONTEXT.style}
Aspect ratio: ${aspectRatio}

Create a stunning, high-quality ${imageType === "thumbnail" ? "video thumbnail" : "social media post"} image featuring:
- Premium presentation of nuts and dried fruits
- Elegant, natural lighting with warm tones
- Sophisticated composition suitable for ${platform.replace("_", " ")}
- Clean, modern aesthetic with subtle brand elegance
- Professional food photography style
- No text overlays, pure visual content

Ultra high resolution, photorealistic, commercial quality.`;

    console.log("Generating image with prompt:", basePrompt);

    // Call Lovable AI image generation endpoint
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "user", content: basePrompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      console.error("AI service error:", statusCode);
      
      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: corsHeaders }
        );
      }
      if (statusCode === 402) {
        return new Response(
          JSON.stringify({ error: "Service credits exhausted. Please add funds." }),
          { status: 402, headers: corsHeaders }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Image generation service unavailable" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const aiData = await response.json();
    console.log("AI response received:", JSON.stringify(aiData).substring(0, 500));

    // Extract image from response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in AI response");
      return new Response(
        JSON.stringify({ error: "Image generation failed - no image returned" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Save to database (storing the base64 data URL directly for now)
    const { data: insertedImage, error: insertError } = await supabase
      .from("generated_images")
      .insert({
        project_id: projectId,
        platform: platform,
        image_url: imageData,
        prompt: basePrompt,
        image_type: imageType,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save generated image" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        image: insertedImage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Image generation failed" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

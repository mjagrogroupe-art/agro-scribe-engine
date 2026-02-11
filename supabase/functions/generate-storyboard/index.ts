import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRICT_PRODUCT_RULES = `STRICT PRODUCT REFERENCE MODE:
- Use ONLY the provided product visuals as reference.
- Product must appear exactly as provided in every frame.
- Camera motion may occur AROUND the product, but product integrity must remain intact.
- NEVER alter, redesign, or replace the product in any frame.`;

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

    const { scriptId } = await req.json();
    if (!scriptId) {
      return new Response(JSON.stringify({ error: "Missing required field: scriptId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch script with project and product
    const { data: script, error: scriptError } = await supabase
      .from("generated_scripts")
      .select("*, projects(id, product_sku, language, product_id, products(*))")
      .eq("id", scriptId)
      .single();

    if (scriptError || !script) {
      return new Response(JSON.stringify({ error: "Script not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const product = script.projects?.products;

    let productBlock = "";
    if (product) {
      productBlock = `
PRODUCT (reference-locked):
- Name: ${product.name} (SKU: ${product.sku})
- Pack Type: ${product.pack_type || "N/A"}
- Description: ${product.description || "N/A"}`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `${STRICT_PRODUCT_RULES}

${productBlock}

Create a detailed shot-by-shot storyboard for a short-form video.

SCRIPT:
${script.full_script}

DURATION: ${script.duration_seconds} seconds
PLATFORM: ${script.platform}

BRAND: TAVAAZO (MJ Agro) — Premium, calm, credible
Visual Style: Clean, minimalist, high-end food photography

Create ${Math.ceil(script.duration_seconds / 3)}-${Math.ceil(script.duration_seconds / 2)} frames covering the entire script.

For each frame provide:
1. frame_number, 2. timestamp_start, 3. timestamp_end,
4. scene_description, 5. visual_direction,
6. camera_angle, 7. text_overlay (or null), 8. audio_cue

Return ONLY a valid JSON array of frame objects.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional video director. STRICT PRODUCT REFERENCE MODE. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      if (statusCode === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: corsHeaders });
      if (statusCode === 402) return new Response(JSON.stringify({ error: "Service credits exhausted." }), { status: 402, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Storyboard generation service unavailable" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Invalid response format" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let frames: any[];
    try { frames = JSON.parse(jsonMatch[0]); } catch {
      return new Response(JSON.stringify({ error: "Response parsing failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: storyboard, error: storyboardError } = await supabase
      .from("storyboards")
      .insert({ project_id: script.project_id, script_id: scriptId, platform: script.platform })
      .select().single();

    if (storyboardError || !storyboard) {
      return new Response(JSON.stringify({ error: "Failed to save storyboard" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const frameRecords = frames.map((f, i) => ({
      storyboard_id: storyboard.id,
      frame_number: f.frame_number || i + 1,
      timestamp_start: f.timestamp_start || 0,
      timestamp_end: f.timestamp_end || 0,
      scene_description: f.scene_description || "",
      visual_direction: f.visual_direction || "",
      camera_angle: f.camera_angle || null,
      text_overlay: f.text_overlay || null,
      audio_cue: f.audio_cue || null,
    }));

    const { error: framesError } = await supabase.from("storyboard_frames").insert(frameRecords);
    if (framesError) {
      await supabase.from("storyboards").delete().eq("id", storyboard.id);
      return new Response(JSON.stringify({ error: "Failed to save frames" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ success: true, storyboardId: storyboard.id, frameCount: frames.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Storyboard generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

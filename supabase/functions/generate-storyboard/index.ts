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
  visualStyle: "Clean, minimalist, high-end food photography aesthetic",
};

const RequestSchema = z.object({
  scriptId: z.string().uuid("Invalid script ID format"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse and validate request body
    let requestBody;
    try {
      const body = await req.json();
      requestBody = RequestSchema.parse(body);
    } catch (error) {
      console.error("Validation error:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { scriptId } = requestBody;

    // Fetch the script
    const { data: script, error: scriptError } = await supabase
      .from("generated_scripts")
      .select("*, projects(id, product_sku, language)")
      .eq("id", scriptId)
      .single();

    if (scriptError || !script) {
      console.error("Script fetch error:", scriptError);
      return new Response(
        JSON.stringify({ error: "Script not found" }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("AI API key not configured");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Create a detailed shot-by-shot storyboard for a short-form video.

SCRIPT:
${script.full_script}

DURATION: ${script.duration_seconds} seconds
PLATFORM: ${script.platform}
PRODUCT: ${script.projects?.product_sku || "Premium nuts and dried fruits"}

BRAND STYLE:
- Brand: ${BRAND_CONTEXT.name} (${BRAND_CONTEXT.company})
- Tone: ${BRAND_CONTEXT.tone}
- Visual Style: ${BRAND_CONTEXT.visualStyle}

Create ${Math.ceil(script.duration_seconds / 3)}-${Math.ceil(script.duration_seconds / 2)} frames that cover the entire script.

For each frame, provide:
1. frame_number: Sequential number (1, 2, 3...)
2. timestamp_start: Start time in seconds (e.g., 0)
3. timestamp_end: End time in seconds (e.g., 2.5)
4. scene_description: What's happening in the scene (1-2 sentences)
5. visual_direction: Camera work, lighting, product placement details
6. camera_angle: e.g., "Close-up", "Wide shot", "Medium shot", "Top-down", "Tracking shot"
7. text_overlay: Any on-screen text if applicable (or null)
8. audio_cue: Background music mood, sound effects, or voiceover snippet

Ensure frames flow naturally and match the script's timing perfectly.
Return ONLY a valid JSON array of frame objects.`;

    console.log("Generating storyboard for script:", scriptId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are a professional video director and storyboard artist specializing in premium food and lifestyle brands. Return only valid JSON arrays." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      console.error("AI service error:", statusCode);
      
      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (statusCode === 402) {
        return new Response(
          JSON.stringify({ error: "Service credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Storyboard generation service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Invalid AI response format:", content.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Invalid response format" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let frames: any[];
    try {
      frames = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Response parsing failed" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create storyboard record
    const { data: storyboard, error: storyboardError } = await supabase
      .from("storyboards")
      .insert({
        project_id: script.project_id,
        script_id: scriptId,
        platform: script.platform,
      })
      .select()
      .single();

    if (storyboardError || !storyboard) {
      console.error("Storyboard insert error:", storyboardError);
      return new Response(
        JSON.stringify({ error: "Failed to save storyboard" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert all frames
    const frameRecords = frames.map((f, index) => ({
      storyboard_id: storyboard.id,
      frame_number: f.frame_number || index + 1,
      timestamp_start: f.timestamp_start || 0,
      timestamp_end: f.timestamp_end || 0,
      scene_description: f.scene_description || "",
      visual_direction: f.visual_direction || "",
      camera_angle: f.camera_angle || null,
      text_overlay: f.text_overlay || null,
      audio_cue: f.audio_cue || null,
    }));

    const { error: framesError } = await supabase
      .from("storyboard_frames")
      .insert(frameRecords);

    if (framesError) {
      console.error("Frames insert error:", framesError);
      // Clean up storyboard if frames failed
      await supabase.from("storyboards").delete().eq("id", storyboard.id);
      return new Response(
        JSON.stringify({ error: "Failed to save storyboard frames" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Storyboard created successfully:", storyboard.id, "with", frames.length, "frames");

    return new Response(
      JSON.stringify({ 
        success: true, 
        storyboardId: storyboard.id, 
        frameCount: frames.length 
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Storyboard generation failed" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

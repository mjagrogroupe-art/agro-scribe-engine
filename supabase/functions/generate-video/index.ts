import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, platform, prompt, durationSeconds = 5 } = await req.json();

    if (!projectId || !platform || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: projectId, platform, prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Video generation service is not configured. GEMINI_API_KEY required with Veo API access.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project with product for context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, product_id, products(*)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Enhance prompt with product context if available
    const product = project.products;
    let enhancedPrompt = prompt;
    if (product) {
      enhancedPrompt = `${prompt}. Product: ${product.name} (${product.pack_type || ''} ${product.pack_size || ''}). Product must appear exactly as its real-world packaging — no alterations allowed.`;
    }

    const { data: pendingVideo, error: insertError } = await supabase
      .from('generated_videos')
      .insert({ project_id: projectId, platform, prompt: enhancedPrompt, status: 'generating', duration_seconds: durationSeconds })
      .select().single();

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to create video record' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aspectRatio = ['tiktok', 'instagram_reels', 'facebook_reels', 'youtube_shorts'].includes(platform) ? '9:16' : '16:9';
    const MODEL_ID = 'veo-2.0-generate-001';

    const veoResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateVideos?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateVideoConfig: { prompt: enhancedPrompt, aspectRatio, numberOfVideos: 1 } }),
      }
    );

    if (!veoResponse.ok) {
      const errorText = await veoResponse.text();
      console.error('Veo API error:', veoResponse.status, errorText);
      await supabase.from('generated_videos').update({ status: 'failed' }).eq('id', pendingVideo.id);

      if (veoResponse.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (veoResponse.status === 402 || veoResponse.status === 403) return new Response(JSON.stringify({ error: 'API quota exceeded or billing issue.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      return new Response(
        JSON.stringify({ error: 'Video generation failed. Ensure your Gemini API key has Veo API access enabled.', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const veoResult = await veoResponse.json();

    if (veoResult.name) {
      let operationResult = veoResult;
      for (let i = 0; i < 60; i++) {
        if (operationResult.done) break;
        await new Promise(resolve => setTimeout(resolve, 5000));
        const pollResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationResult.name}?key=${GEMINI_API_KEY}`);
        if (!pollResponse.ok) continue;
        operationResult = await pollResponse.json();
      }

      if (operationResult.done && operationResult.response) {
        const videos = operationResult.response.generatedVideos;
        if (videos?.length > 0 && videos[0].video?.uri) {
          const { data: updatedVideo } = await supabase
            .from('generated_videos')
            .update({ video_url: videos[0].video.uri, status: 'completed' })
            .eq('id', pendingVideo.id).select().single();

          return new Response(JSON.stringify({ success: true, video: updatedVideo }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      if (!operationResult.done) {
        await supabase.from('generated_videos').update({ status: 'processing', video_url: operationResult.name }).eq('id', pendingVideo.id);
        return new Response(JSON.stringify({ success: true, video: { ...pendingVideo, status: 'processing' }, message: 'Video generation started.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const errorMsg = operationResult.error?.message || 'No video generated';
      await supabase.from('generated_videos').update({ status: 'failed' }).eq('id', pendingVideo.id);
      return new Response(JSON.stringify({ error: errorMsg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('generated_videos').update({ status: 'failed' }).eq('id', pendingVideo.id);
    return new Response(JSON.stringify({ error: 'Unexpected API response format' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

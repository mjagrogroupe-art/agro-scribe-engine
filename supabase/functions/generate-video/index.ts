import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform dimensions for video generation
const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'tiktok': { width: 1080, height: 1920 },
  'instagram_reels': { width: 1080, height: 1920 },
  'facebook_reels': { width: 1080, height: 1920 },
  'youtube_shorts': { width: 1080, height: 1920 },
};

serve(async (req) => {
  // Handle CORS preflight requests
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
      console.error('GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Video generation service is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert pending video record
    const { data: pendingVideo, error: insertError } = await supabase
      .from('generated_videos')
      .insert({
        project_id: projectId,
        platform,
        prompt,
        status: 'generating',
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create video record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create video record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting video generation for project ${projectId}, video ${pendingVideo.id}`);

    const dimensions = PLATFORM_DIMENSIONS[platform] || { width: 1080, height: 1920 };

    // Call Google Veo 3 API via Gemini
    // Note: Veo 3 is accessed through the Generative Language API
    const veoResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
            }
          ],
          parameters: {
            aspectRatio: dimensions.width > dimensions.height ? '16:9' : '9:16',
            durationSeconds: durationSeconds,
            personGeneration: 'allow_adult',
          }
        }),
      }
    );

    if (!veoResponse.ok) {
      const errorText = await veoResponse.text();
      console.error('Veo API error:', veoResponse.status, errorText);

      // Update video status to failed
      await supabase
        .from('generated_videos')
        .update({ status: 'failed' })
        .eq('id', pendingVideo.id);

      if (veoResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (veoResponse.status === 402 || veoResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: 'API quota exceeded or billing issue. Please check your Gemini API settings.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Video generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const veoResult = await veoResponse.json();
    console.log('Veo API response:', JSON.stringify(veoResult, null, 2));

    // For long-running operations, we get an operation name
    // The video URL will be in the operation result
    let videoUrl = null;
    
    if (veoResult.name) {
      // This is a long-running operation, we need to poll for completion
      // For now, store the operation name and update status
      await supabase
        .from('generated_videos')
        .update({ 
          status: 'processing',
          video_url: veoResult.name // Store operation name temporarily
        })
        .eq('id', pendingVideo.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          video: { ...pendingVideo, status: 'processing' },
          message: 'Video generation started. It will be ready in a few minutes.',
          operationName: veoResult.name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we get an immediate result with video
    if (veoResult.predictions && veoResult.predictions[0]) {
      const prediction = veoResult.predictions[0];
      videoUrl = prediction.videoUri || prediction.video?.uri;
    }

    if (videoUrl) {
      // Update video record with URL
      const { data: updatedVideo, error: updateError } = await supabase
        .from('generated_videos')
        .update({ 
          video_url: videoUrl,
          status: 'completed'
        })
        .eq('id', pendingVideo.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update video record:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, video: updatedVideo || { ...pendingVideo, video_url: videoUrl, status: 'completed' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No video URL in response
    await supabase
      .from('generated_videos')
      .update({ status: 'failed' })
      .eq('id', pendingVideo.id);

    return new Response(
      JSON.stringify({ error: 'No video URL in response', details: veoResult }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
